import "server-only";

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

import Redis from "ioredis";

import {
  cacheVastOfferRoutesDirect,
  getCachedVastOfferRouteDirect,
} from "@/lib/admin/vast-offer-cache";
import { scheduleVastLeaseDestructionDirect } from "@/lib/admin/vast-lifecycle-queue";
import { generationQueueNames } from "@/lib/generation/queue-contracts";
import { enqueueGenerationJobDirect } from "@/lib/generation/queue";
import {
  consumeGenerationRateLimitDirect,
  GenerationRateLimitError,
} from "@/lib/generation/rate-limit";
import {
  queueGatewayPaths,
  type CacheVastOffersRequest,
  type CachedOfferRoute,
  type ConsumeGenerationRateLimitRequest,
  type EnqueueGenerationRequest,
  type GetVastOfferRequest,
  type ScheduleVastLifecycleRequest,
} from "@/lib/redis-gateway/contracts";
import { queueGatewayHeaders, verifyQueueGatewayRequest } from "@/lib/redis-gateway/signature";

const MAX_BODY_BYTES = 64 * 1024;
const NONCE_TTL_SECONDS = 120;
const DEFAULT_PORT = 8787;

class GatewayHttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

const redisUrl = requiredEnv("REDIS_URL");
const hmacKey = requiredEnv("QUEUE_GATEWAY_HMAC_KEY");
if (hmacKey.length < 32) throw new Error("QUEUE_GATEWAY_HMAC_KEY debe tener al menos 32 caracteres.");

const redis = new Redis(redisUrl, {
  connectTimeout: 5_000,
  maxRetriesPerRequest: 1,
});
redis.on("error", (error) => console.error("[redis-gateway] Redis:", error.message));

const server = createServer(async (request, response) => {
  try {
    await handleRequest(request, response);
  } catch (error) {
    handleError(response, error);
  }
});

const port = parsePort(process.env.QUEUE_GATEWAY_PORT);
server.listen(port, "0.0.0.0", () => {
  console.log(`[redis-gateway] Escuchando en el puerto ${port}.`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    server.close(() => {
      void redis.quit().finally(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  });
}

async function handleRequest(request: IncomingMessage, response: ServerResponse) {
  const method = request.method?.toUpperCase() ?? "GET";
  const pathname = new URL(request.url ?? "/", "http://localhost").pathname;

  if (method === "GET" && pathname === "/health") {
    const pong = await redis.ping();
    return json(response, pong === "PONG" ? 200 : 503, {
      ok: pong === "PONG",
      service: "bellas-artes-redis-gateway",
    });
  }
  if (method !== "POST" || !Object.values(queueGatewayPaths).includes(pathname as never)) {
    throw new GatewayHttpError(404, "NOT_FOUND", "Ruta no encontrada.");
  }

  const body = await readBody(request);
  await authenticateRequest(request, method, pathname, body);
  const payload: unknown = parseJson(body);

  switch (pathname) {
    case queueGatewayPaths.enqueueGeneration: {
      const input = validateEnqueueGeneration(payload);
      const job = await enqueueGenerationJobDirect(input);
      return success(response, { id: job.id ?? null });
    }
    case queueGatewayPaths.scheduleVastLifecycle: {
      const input = validateScheduleVastLifecycle(payload);
      const job = await scheduleVastLeaseDestructionDirect(input.leaseId, input.expiresAt);
      return success(response, { id: job.id ?? null });
    }
    case queueGatewayPaths.consumeGenerationRateLimit: {
      const input = validateRateLimit(payload);
      await consumeGenerationRateLimitDirect(input);
      return success(response, { consumed: true });
    }
    case queueGatewayPaths.cacheVastOffers: {
      const input = validateCacheOffers(payload);
      await cacheVastOfferRoutesDirect(input.offers);
      return success(response, { cached: input.offers.length });
    }
    case queueGatewayPaths.getVastOffer: {
      const input = validateGetOffer(payload);
      const route = await getCachedVastOfferRouteDirect(input.offerId);
      return success(response, { route });
    }
    default:
      throw new GatewayHttpError(404, "NOT_FOUND", "Ruta no encontrada.");
  }
}

async function authenticateRequest(request: IncomingMessage, method: string, pathname: string, body: string) {
  const timestamp = singleHeader(request, queueGatewayHeaders.timestamp);
  const nonce = singleHeader(request, queueGatewayHeaders.nonce);
  const signature = singleHeader(request, queueGatewayHeaders.signature);
  if (!timestamp || !nonce || !signature || !isUuid(nonce)) {
    throw new GatewayHttpError(401, "INVALID_SIGNATURE", "Autenticación inválida.");
  }
  const valid = verifyQueueGatewayRequest({ method, pathname, timestamp, nonce, body, signature }, hmacKey);
  if (!valid) throw new GatewayHttpError(401, "INVALID_SIGNATURE", "Autenticación inválida.");

  const prefix = process.env.BULLMQ_PREFIX?.trim() || "bellas-artes";
  const accepted = await redis.set(`${prefix}:gateway:nonce:${nonce}`, "1", "EX", NONCE_TTL_SECONDS, "NX");
  if (accepted !== "OK") throw new GatewayHttpError(409, "REPLAY_DETECTED", "Solicitud repetida.");
}

async function readBody(request: IncomingMessage) {
  const contentLength = Number(request.headers["content-length"] ?? 0);
  if (contentLength > MAX_BODY_BYTES) throw new GatewayHttpError(413, "PAYLOAD_TOO_LARGE", "Solicitud demasiado grande.");
  const chunks: Buffer[] = [];
  let bytes = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    bytes += buffer.byteLength;
    if (bytes > MAX_BODY_BYTES) throw new GatewayHttpError(413, "PAYLOAD_TOO_LARGE", "Solicitud demasiado grande.");
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function validateEnqueueGeneration(value: unknown): EnqueueGenerationRequest {
  const input = objectValue(value);
  const kind = stringValue(input.kind, "kind");
  if (!generationQueueNames.includes(kind as EnqueueGenerationRequest["kind"])) invalid("kind inválido.");
  const priority = input.priority === undefined ? undefined : integerValue(input.priority, "priority", 1, 2_097_152);
  return { kind: kind as EnqueueGenerationRequest["kind"], jobId: uuidValue(input.jobId, "jobId"), priority };
}

function validateScheduleVastLifecycle(value: unknown): ScheduleVastLifecycleRequest {
  const input = objectValue(value);
  const expiresAt = stringValue(input.expiresAt, "expiresAt");
  if (!Number.isFinite(Date.parse(expiresAt))) invalid("expiresAt inválido.");
  return { leaseId: uuidValue(input.leaseId, "leaseId"), expiresAt };
}

function validateRateLimit(value: unknown): ConsumeGenerationRateLimitRequest {
  const input = objectValue(value);
  return {
    userId: uuidValue(input.userId, "userId"),
    kind: boundedString(input.kind, "kind", 1, 40),
  };
}

function validateCacheOffers(value: unknown): CacheVastOffersRequest {
  const input = objectValue(value);
  if (!Array.isArray(input.offers) || input.offers.length > 200) invalid("offers inválido.");
  return { offers: input.offers.map(validateOfferRoute) };
}

function validateOfferRoute(value: unknown): CachedOfferRoute {
  const input = objectValue(value);
  const preset = stringValue(input.preset, "preset");
  const market = stringValue(input.market, "market");
  if (preset !== "comfy-clean" && preset !== "flux-cached") invalid("preset inválido.");
  if (market !== "on-demand" && market !== "bid") invalid("market inválido.");
  const hourlyUsd = numberValue(input.hourlyUsd, "hourlyUsd");
  if (hourlyUsd <= 0) invalid("hourlyUsd inválido.");
  return {
    offerId: integerValue(input.offerId, "offerId", 1),
    machineId: integerValue(input.machineId, "machineId", 1),
    hourlyUsd,
    preset,
    market,
  };
}

function validateGetOffer(value: unknown): GetVastOfferRequest {
  const input = objectValue(value);
  return { offerId: integerValue(input.offerId, "offerId", 1) };
}

function parseJson(body: string) {
  try {
    return JSON.parse(body) as unknown;
  } catch {
    throw new GatewayHttpError(400, "INVALID_JSON", "El cuerpo JSON es inválido.");
  }
}

function handleError(response: ServerResponse, error: unknown) {
  if (response.headersSent) return response.end();
  if (error instanceof GenerationRateLimitError) {
    return failure(response, 429, error.code, error.message);
  }
  if (error instanceof GatewayHttpError) {
    return failure(response, error.status, error.code, error.message);
  }
  console.error("[redis-gateway] Solicitud fallida:", error instanceof Error ? error.message : "error desconocido");
  return failure(response, 503, "QUEUE_BACKEND_UNAVAILABLE", "El backend de colas no está disponible.");
}

function success<T>(response: ServerResponse, data: T) {
  return json(response, 200, { ok: true, data });
}

function failure(response: ServerResponse, status: number, code: string, message: string) {
  return json(response, status, { ok: false, error: { code, message } });
}

function json(response: ServerResponse, status: number, payload: unknown) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  response.end(JSON.stringify(payload));
}

function singleHeader(request: IncomingMessage, name: string) {
  const value = request.headers[name];
  return Array.isArray(value) ? undefined : value;
}

function objectValue(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid("El cuerpo debe ser un objeto.");
  return value as Record<string, unknown>;
}

function uuidValue(value: unknown, field: string) {
  const result = stringValue(value, field);
  if (!isUuid(result)) invalid(`${field} inválido.`);
  return result;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function boundedString(value: unknown, field: string, min: number, max: number) {
  const result = stringValue(value, field);
  if (result.length < min || result.length > max) invalid(`${field} inválido.`);
  return result;
}

function stringValue(value: unknown, field: string) {
  if (typeof value !== "string" || !value.trim()) invalid(`${field} es obligatorio.`);
  return value.trim();
}

function integerValue(value: unknown, field: string, min: number, max = Number.MAX_SAFE_INTEGER) {
  if (!Number.isSafeInteger(value) || (value as number) < min || (value as number) > max) invalid(`${field} inválido.`);
  return value as number;
}

function numberValue(value: unknown, field: string) {
  if (typeof value !== "number" || !Number.isFinite(value)) invalid(`${field} inválido.`);
  return value;
}

function invalid(message: string): never {
  throw new GatewayHttpError(400, "INVALID_REQUEST", message);
}

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} no está configurado.`);
  return value;
}

function parsePort(value: string | undefined) {
  const port = Number(value ?? DEFAULT_PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) throw new Error("QUEUE_GATEWAY_PORT inválido.");
  return port;
}
