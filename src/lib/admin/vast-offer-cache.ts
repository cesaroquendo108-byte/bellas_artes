import "server-only";

import Redis from "ioredis";

import type { VastAdminMarket, VastAdminPreset, VastOffer } from "@/lib/admin/vast-contracts";
import { isQueueGatewayConfigured, postQueueGateway } from "@/lib/redis-gateway/client";
import {
  queueGatewayPaths,
  type CacheVastOffersRequest,
  type CachedOfferRoute,
  type GetVastOfferRequest,
} from "@/lib/redis-gateway/contracts";

const OFFER_CACHE_TTL_SECONDS = 5 * 60;

export type CachedVastOfferRoute = {
  machineId: number;
  hourlyUsd: number;
  preset: VastAdminPreset;
  market: VastAdminMarket;
};

const inMemoryOfferCache = new Map<number, { route: CachedVastOfferRoute; expiresAt: number }>();

export async function cacheVastOfferRoutes(
  offers: VastOffer[],
  preset: VastAdminPreset,
  market: VastAdminMarket,
) {
  if (!offers.length) return;
  const routes: CachedOfferRoute[] = offers.map((offer) => ({
    offerId: offer.id,
    machineId: offer.machineId,
    hourlyUsd: offer.hourlyUsd,
    preset,
    market,
  }));
  rememberRoutes(routes);
  try {
    if (isQueueGatewayConfigured()) {
      await postQueueGateway<CacheVastOffersRequest, { cached: number }>(
        queueGatewayPaths.cacheVastOffers,
        { offers: routes },
      );
    } else {
      await cacheVastOfferRoutesDirect(routes);
    }
  } catch {
    // Fallback in-memory cache is already populated
  }
}

export async function cacheVastOfferRoutesDirect(routes: CachedOfferRoute[]) {
  if (!routes.length) return;
  rememberRoutes(routes);
  const redis = createRedis();
  try {
    const pipeline = redis.pipeline();
    for (const route of routes) {
      pipeline.set(
        keyForOffer(route.offerId),
        JSON.stringify({
          machineId: route.machineId,
          hourlyUsd: route.hourlyUsd,
          preset: route.preset,
          market: route.market,
        } satisfies CachedVastOfferRoute),
        "EX",
        OFFER_CACHE_TTL_SECONDS,
      );
    }
    await pipeline.exec();
  } finally {
    redis.disconnect();
  }
}

export async function getCachedVastOfferRoute(offerId: number): Promise<CachedVastOfferRoute | null> {
  try {
    if (isQueueGatewayConfigured()) {
      const response = await postQueueGateway<GetVastOfferRequest, { route: CachedVastOfferRoute | null }>(
        queueGatewayPaths.getVastOffer,
        { offerId },
      );
      if (response.route) return response.route;
    } else {
      const route = await getCachedVastOfferRouteDirect(offerId);
      if (route) return route;
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

export async function getCachedVastOfferRouteDirect(offerId: number): Promise<CachedVastOfferRoute | null> {
  const redis = createRedis();
  try {
    const value = await redis.get(keyForOffer(offerId));
    if (!value) return null;
    return parseCachedOfferRoute(value);
  } finally {
    redis.disconnect();
  }
}

function rememberRoutes(routes: CachedOfferRoute[]) {
  const expiresAt = Date.now() + OFFER_CACHE_TTL_SECONDS * 1000;
  for (const route of routes) {
    inMemoryOfferCache.set(route.offerId, {
      route: {
        machineId: route.machineId,
        hourlyUsd: route.hourlyUsd,
        preset: route.preset,
        market: route.market,
      },
      expiresAt,
    });
  }
}

function parseCachedOfferRoute(value: string): CachedVastOfferRoute | null {
  const parsed = JSON.parse(value) as Partial<CachedVastOfferRoute>;
  if (Number.isInteger(parsed.machineId) && (parsed.machineId ?? 0) > 0
    && typeof parsed.hourlyUsd === "number" && Number.isFinite(parsed.hourlyUsd) && parsed.hourlyUsd > 0
    && (parsed.preset === "comfy-clean" || parsed.preset === "flux-cached")
    && (parsed.market === "on-demand" || parsed.market === "bid")) {
    return parsed as CachedVastOfferRoute;
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
