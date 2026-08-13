export const vastAdminPresets = ["comfy-clean", "flux-cached"] as const;
export const vastAdminMarkets = ["on-demand", "bid"] as const;
export const vastAdminTtlMinutes = [15, 30, 60, 120] as const;
export const supportedVastGpuFamilies = [
  "RTX 3090",
  "RTX PRO 4000",
  "RTX 4090",
  "RTX 5090",
  "RTX PRO 4500",
] as const;
export const vastLeaseStates = [
  "pending",
  "reconciling",
  "loading",
  "running",
  "stopped",
  "destroying",
  "destroyed",
  "failed",
  "orphaned",
] as const;

export type VastAdminPreset = (typeof vastAdminPresets)[number];
export type VastAdminMarket = (typeof vastAdminMarkets)[number];
export type VastAdminTtlMinutes = (typeof vastAdminTtlMinutes)[number];
export type SupportedVastGpuFamily = (typeof supportedVastGpuFamilies)[number];
export type VastLeaseState = (typeof vastLeaseStates)[number];
export type VastLifecycleHealth = "healthy" | "degraded" | "stale" | "stopped" | "not_configured" | "error";

export type VastAdminLimits = {
  maxActiveInstances: number;
  maxHourlyUsd: number;
  maxRentalUsd: number;
  minBalanceReserveUsd: number;
  minReliability: number;
  minGpuRamMb: number;
};

export type VastPresetStatus = {
  id: VastAdminPreset;
  name: string;
  description: string;
  available: boolean;
  unavailableReason: string | null;
};

export type VastOffer = {
  id: number;
  machineId: number;
  gpuName: string;
  gpuRamMb: number;
  numGpus: number;
  reliability: number;
  geolocation: string;
  hourlyUsd: number;
  minBidUsd: number | null;
  bidPriceUsd: number | null;
  diskSpaceGb: number;
  inetDownMbps: number | null;
  inetUpMbps: number | null;
  market: VastAdminMarket;
  projectedCostUsd: number;
};

export type VastInstance = {
  id: number;
  label: string;
  status: string;
  gpuName: string;
  gpuRamMb: number;
  hourlyUsd: number | null;
  publicIp: string | null;
  sshHost: string | null;
  sshPort: number | null;
  sshCommand: string | null;
  tunnelCommand: string | null;
  comfyUrl: string | null;
  managed: boolean;
  leaseId: string | null;
};

export type VastAdminLease = {
  id: string;
  requestId: string;
  vastInstanceId: number | null;
  preset: VastAdminPreset;
  market: VastAdminMarket;
  state: VastLeaseState;
  label: string;
  gpuName: string | null;
  gpuRamMb: number | null;
  hourlyCostUsd: number;
  estimatedMaxCostUsd: number;
  balanceBeforeUsd: number;
  balanceAfterUsd: number | null;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  destroyedAt: string | null;
  errorCode: string | null;
  errorMessage: string | null;
};

export type VastAdminOverview = {
  generatedAt: string;
  enabled: boolean;
  configured: boolean;
  balanceUsd: number | null;
  canPay: boolean;
  activeManagedInstances: number;
  activeAccountInstances: number;
  currentHourlyUsd: number;
  limits: VastAdminLimits;
  lifecycle: {
    state: VastLifecycleHealth;
    observedAt: string | null;
    summary: string;
  };
  presets: VastPresetStatus[];
  leases: VastAdminLease[];
  instances: VastInstance[];
};

export type CreateVastLeaseRequest = {
  requestId: string;
  offerId: number;
  preset: VastAdminPreset;
  market: VastAdminMarket;
  ttlMinutes: VastAdminTtlMinutes;
  confirmation: "ALQUILAR GPU";
};

export type VastInstanceAction = "start" | "stop" | "destroy";

export function getSupportedVastGpuFamily(value: string): SupportedVastGpuFamily | null {
  const normalized = value
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^NVIDIA\s+/, "")
    .replace(/^GEFORCE\s+/, "")
    .replace(/\s+(BLACKWELL|ADA|LOVELACE|AMPERE)$/, "");
  return supportedVastGpuFamilies.find((family) => family === normalized) ?? null;
}

export function isSupportedVastGpuFamily(value: string) {
  return getSupportedVastGpuFamily(value) !== null;
}

export function calculateBidPrice(minBidUsd: number) {
  if (!Number.isFinite(minBidUsd) || minBidUsd <= 0) return null;
  return ceilUsd(minBidUsd * 1.1);
}

export function calculateProjectedCost(hourlyUsd: number, ttlMinutes: number) {
  if (!Number.isFinite(hourlyUsd) || hourlyUsd < 0 || !Number.isFinite(ttlMinutes) || ttlMinutes <= 0) return Number.POSITIVE_INFINITY;
  return ceilUsd(hourlyUsd * (ttlMinutes / 60));
}

function ceilUsd(value: number) {
  return Math.ceil((value - Number.EPSILON) * 1_000_000) / 1_000_000;
}

export function classifyLifecycleHeartbeat(input: {
  observedAt: string | null;
  reportedStatus: string | null;
  now?: number;
}): VastLifecycleHealth {
  if (!input.observedAt) return "not_configured";
  if (input.reportedStatus === "error") return "error";
  if (input.reportedStatus === "stopped") return "stopped";
  const observed = Date.parse(input.observedAt);
  if (!Number.isFinite(observed)) return "error";
  const ageMs = (input.now ?? Date.now()) - observed;
  if (ageMs <= 90_000) return "healthy";
  if (ageMs <= 180_000) return "degraded";
  return "stale";
}

export function validateOfferForRental(input: {
  offer: Pick<VastOffer, "gpuName" | "numGpus" | "gpuRamMb" | "reliability" | "hourlyUsd" | "machineId">;
  preset: VastAdminPreset;
  limits: VastAdminLimits;
  fluxMachineId: number | null;
}) {
  const { offer, limits } = input;
  if (!isSupportedVastGpuFamily(offer.gpuName)) return "VAST_OFFER_GPU_FAMILY";
  if (offer.numGpus !== 1) return "VAST_OFFER_GPU_COUNT";
  if (offer.gpuRamMb < limits.minGpuRamMb) return "VAST_OFFER_VRAM";
  if (offer.reliability < limits.minReliability) return "VAST_OFFER_RELIABILITY";
  if (offer.hourlyUsd <= 0 || offer.hourlyUsd > limits.maxHourlyUsd) return "VAST_OFFER_PRICE";
  if (input.preset === "flux-cached" && (!input.fluxMachineId || offer.machineId !== input.fluxMachineId)) return "VAST_OFFER_VOLUME_MACHINE";
  return null;
}

export function isTerminalVastLeaseState(state: VastLeaseState) {
  return state === "destroyed" || state === "failed";
}
