import Redis from "ioredis";
import { isQueueGatewayConfigured, postQueueGateway, QueueGatewayError } from "@/lib/redis-gateway/client";
import {
  queueGatewayPaths,
  type ConsumeGenerationRateLimitRequest,
} from "@/lib/redis-gateway/contracts";

export class GenerationRateLimitError extends Error {
  readonly code = "GENERATION_RATE_LIMITED";
  readonly status = 429;
}

export async function consumeGenerationRateLimitDirect(input: ConsumeGenerationRateLimitRequest) {
  if (process.env.GENERATION_RATE_LIMIT_ENABLED !== "true") return;
  const url = process.env.REDIS_URL?.trim();
  if (!url) throw new Error("GENERATION_RATE_LIMIT_REDIS_NOT_CONFIGURED");
  const windowSeconds = Math.max(Number(process.env.GENERATION_RATE_LIMIT_WINDOW_SECONDS ?? 3600), 60);
  const limit = Math.max(Number(process.env.GENERATION_RATE_LIMIT_MAX ?? 10), 1);
  const bucket = Math.floor(Date.now() / (windowSeconds * 1000));
  const key = `${process.env.BULLMQ_PREFIX ?? "bellas-artes"}:rate:${input.userId}:${input.kind}:${bucket}`;
  const redis = new Redis(url, { maxRetriesPerRequest: 1, connectTimeout: 5000 });
  try {
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, windowSeconds);
    if (count > limit) throw new GenerationRateLimitError("Has alcanzado el límite temporal de generaciones.");
  } finally {
    await redis.quit().catch(() => redis.disconnect());
  }
}

export async function consumeGenerationRateLimit(input: ConsumeGenerationRateLimitRequest) {
  if (!isQueueGatewayConfigured()) return consumeGenerationRateLimitDirect(input);
  if (process.env.GENERATION_RATE_LIMIT_ENABLED !== "true") return;
  try {
    await postQueueGateway<ConsumeGenerationRateLimitRequest, { consumed: true }>(
      queueGatewayPaths.consumeGenerationRateLimit,
      input,
    );
  } catch (error) {
    if (error instanceof QueueGatewayError && error.status === 429) {
      throw new GenerationRateLimitError(error.message);
    }
    throw error;
  }
}
