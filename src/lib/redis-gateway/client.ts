import "server-only";

import { randomUUID } from "node:crypto";

import type { QueueGatewayResponse } from "./contracts";
import { queueGatewayHeaders, signQueueGatewayRequest } from "./signature";

const REQUEST_TIMEOUT_MS = 5_000;

export class QueueGatewayError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
    this.name = "QueueGatewayError";
  }
}

export function isQueueGatewayConfigured() {
  return Boolean(process.env.QUEUE_GATEWAY_URL?.trim() && process.env.QUEUE_GATEWAY_HMAC_KEY?.trim());
}

export async function postQueueGateway<TRequest, TResponse>(pathname: string, payload: TRequest) {
  const baseUrl = process.env.QUEUE_GATEWAY_URL?.trim();
  const secret = process.env.QUEUE_GATEWAY_HMAC_KEY?.trim();
  if (!baseUrl || !secret) throw new Error("QUEUE_GATEWAY_NOT_CONFIGURED");

  const url = new URL(pathname, ensureTrailingSlash(baseUrl));
  const body = JSON.stringify(payload);
  const timestamp = String(Date.now());
  const nonce = randomUUID();
  const signature = signQueueGatewayRequest({ method: "POST", pathname: url.pathname, timestamp, nonce, body }, secret);

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        [queueGatewayHeaders.timestamp]: timestamp,
        [queueGatewayHeaders.nonce]: nonce,
        [queueGatewayHeaders.signature]: signature,
      },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    throw new QueueGatewayError(
      error instanceof Error ? error.message : "No se pudo contactar al gateway de colas.",
      503,
      "QUEUE_GATEWAY_UNAVAILABLE",
    );
  }

  const result = await readResponse<TResponse>(response);
  if (!response.ok || !result.ok) {
    const failure = result.ok ? null : result.error;
    throw new QueueGatewayError(
      failure?.message ?? `El gateway respondió HTTP ${response.status}.`,
      response.status,
      failure?.code ?? "QUEUE_GATEWAY_ERROR",
    );
  }
  return result.data;
}

async function readResponse<T>(response: Response): Promise<QueueGatewayResponse<T>> {
  try {
    return await response.json() as QueueGatewayResponse<T>;
  } catch {
    return {
      ok: false,
      error: { code: "QUEUE_GATEWAY_INVALID_RESPONSE", message: "El gateway devolvió una respuesta inválida." },
    };
  }
}

function ensureTrailingSlash(value: string) {
  return value.endsWith("/") ? value : `${value}/`;
}
