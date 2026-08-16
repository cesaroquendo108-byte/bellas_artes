import type { VastAdminMarket, VastAdminPreset } from "@/lib/admin/vast-contracts";
import type { GenerationQueueKind } from "@/lib/generation/queue-contracts";

export const queueGatewayPaths = {
  enqueueGeneration: "/v1/generation/enqueue",
  scheduleVastLifecycle: "/v1/vast/lifecycle/schedule",
  consumeGenerationRateLimit: "/v1/generation/rate-limit",
  cacheVastOffers: "/v1/vast/offers/cache",
  getVastOffer: "/v1/vast/offers/get",
} as const;

export type EnqueueGenerationRequest = {
  kind: GenerationQueueKind;
  jobId: string;
  priority?: number;
};

export type ScheduleVastLifecycleRequest = {
  leaseId: string;
  expiresAt: string;
};

export type ConsumeGenerationRateLimitRequest = {
  userId: string;
  kind: string;
};

export type CachedOfferRoute = {
  offerId: number;
  machineId: number;
  hourlyUsd: number;
  preset: VastAdminPreset;
  market: VastAdminMarket;
};

export type CacheVastOffersRequest = {
  offers: CachedOfferRoute[];
};

export type GetVastOfferRequest = {
  offerId: number;
};

export type QueueGatewaySuccess<T> = {
  ok: true;
  data: T;
};

export type QueueGatewayFailure = {
  ok: false;
  error: {
    code: string;
    message: string;
  };
};

export type QueueGatewayResponse<T> = QueueGatewaySuccess<T> | QueueGatewayFailure;
