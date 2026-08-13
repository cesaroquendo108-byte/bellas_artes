import "server-only";

import Redis from "ioredis";

import type { VastAdminMarket, VastAdminPreset, VastOffer } from "@/lib/admin/vast-contracts";

const OFFER_CACHE_TTL_SECONDS = 5 * 60;

type CachedOfferRoute = {
  machineId: number;
  hourlyUsd: number;
  preset: VastAdminPreset;
  market: VastAdminMarket;
};

export async function cacheVastOfferRoutes(
  offers: VastOffer[],
  preset: VastAdminPreset,
  market: VastAdminMarket,
) {
  if (!offers.length) return;
  const redis = createRedis();
  try {
    const pipeline = redis.pipeline();
    for (const offer of offers) {
      pipeline.set(
        keyForOffer(offer.id),
        JSON.stringify({ machineId: offer.machineId, hourlyUsd: offer.hourlyUsd, preset, market } satisfies CachedOfferRoute),
        "EX",
        OFFER_CACHE_TTL_SECONDS,
      );
    }
    const results = await pipeline.exec();
    if (!results || results.some(([error]) => Boolean(error))) {
      throw new Error("No se pudieron cachear las rutas de ofertas Vast.");
    }
  } finally {
    redis.disconnect();
  }
}

export async function getCachedVastOfferRoute(offerId: number): Promise<CachedOfferRoute | null> {
  const redis = createRedis();
  try {
    const value = await redis.get(keyForOffer(offerId));
    if (!value) return null;
    const parsed = JSON.parse(value) as Partial<CachedOfferRoute>;
    if (!Number.isInteger(parsed.machineId) || (parsed.machineId ?? 0) <= 0) return null;
    if (typeof parsed.hourlyUsd !== "number" || !Number.isFinite(parsed.hourlyUsd) || parsed.hourlyUsd <= 0) return null;
    if (parsed.preset !== "comfy-clean" && parsed.preset !== "flux-cached") return null;
    if (parsed.market !== "on-demand" && parsed.market !== "bid") return null;
    return parsed as CachedOfferRoute;
  } catch {
    return null;
  } finally {
    redis.disconnect();
  }
}

function createRedis() {
  const redisUrl = process.env.REDIS_URL?.trim();
  if (!redisUrl) throw new Error("REDIS_URL no está configurado para revalidar ofertas Vast.");
  const redis = new Redis(redisUrl, {
    connectTimeout: 5_000,
    commandTimeout: 5_000,
    lazyConnect: false,
    maxRetriesPerRequest: 1,
  });
  redis.on("error", () => undefined);
  return redis;
}

function keyForOffer(offerId: number) {
  return `${process.env.BULLMQ_PREFIX?.trim() || "bellas-artes"}:vast-admin:offer:${offerId}`;
}
