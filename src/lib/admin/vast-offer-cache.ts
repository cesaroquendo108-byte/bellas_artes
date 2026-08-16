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

const inMemoryOfferCache = new Map<number, { route: CachedOfferRoute; expiresAt: number }>();

export async function cacheVastOfferRoutes(
  offers: VastOffer[],
  preset: VastAdminPreset,
  market: VastAdminMarket,
) {
  if (!offers.length) return;
  const now = Date.now();
  for (const offer of offers) {
    inMemoryOfferCache.set(offer.id, {
      route: { machineId: offer.machineId, hourlyUsd: offer.hourlyUsd, preset, market },
      expiresAt: now + OFFER_CACHE_TTL_SECONDS * 1000,
    });
  }
  try {
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
      await pipeline.exec();
    } finally {
      redis.disconnect();
    }
  } catch {
    // Fallback in-memory cache is already populated
  }
}

export async function getCachedVastOfferRoute(offerId: number): Promise<CachedOfferRoute | null> {
  try {
    const redis = createRedis();
    try {
      const value = await redis.get(keyForOffer(offerId));
      if (value) {
        const parsed = JSON.parse(value) as Partial<CachedOfferRoute>;
        if (Number.isInteger(parsed.machineId) && (parsed.machineId ?? 0) > 0
          && typeof parsed.hourlyUsd === "number" && Number.isFinite(parsed.hourlyUsd) && parsed.hourlyUsd > 0
          && (parsed.preset === "comfy-clean" || parsed.preset === "flux-cached")
          && (parsed.market === "on-demand" || parsed.market === "bid")) {
          return parsed as CachedOfferRoute;
        }
      }
    } finally {
      redis.disconnect();
    }
  } catch {
    // Check in-memory fallback on Redis error
  }
  const fallback = inMemoryOfferCache.get(offerId);
  if (fallback && fallback.expiresAt > Date.now()) {
    return fallback.route;
  }
  return null;
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
