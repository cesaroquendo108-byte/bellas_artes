import { isWorkflowConfigured } from "./workflows";

export type ProviderRoute = "vast" | "fake";
export type GenerationProviderKind = "image" | "video" | "audio" | "character" | "world";
export type GenerationBillingMode = "shadow" | "live";
export type GenerationAccessMode = "admin" | "allowlist" | "public";

const vastEndpointVariables: Record<GenerationProviderKind, string> = {
  image: "VAST_IMAGE_COMFY_BASE_URL",
  video: "VAST_VIDEO_COMFY_BASE_URL",
  audio: "VAST_AUDIO_COMFY_BASE_URL",
  character: "VAST_CHARACTER_COMFY_BASE_URL",
  world: "VAST_WORLD_COMFY_BASE_URL",
};

const vastServerlessEndpointVariables: Record<GenerationProviderKind, string> = {
  image: "VAST_IMAGE_SERVERLESS_ENDPOINT",
  video: "VAST_VIDEO_SERVERLESS_ENDPOINT",
  audio: "VAST_AUDIO_SERVERLESS_ENDPOINT",
  character: "VAST_CHARACTER_SERVERLESS_ENDPOINT",
  world: "VAST_WORLD_SERVERLESS_ENDPOINT",
};

function truthy(value: string | undefined) {
  return value === "1" || value?.toLowerCase() === "true";
}

export function getGenerationConfig() {
  const enabled = truthy(process.env.GENERATION_ENABLED);
  const adminOnly = process.env.GENERATION_ADMIN_ONLY === undefined
    ? enabled
    : truthy(process.env.GENERATION_ADMIN_ONLY);
  const requestedAccessMode = process.env.GENERATION_ACCESS_MODE?.trim().toLowerCase();
  const accessMode: GenerationAccessMode = requestedAccessMode === "admin" || requestedAccessMode === "allowlist" || requestedAccessMode === "public"
    ? requestedAccessMode
    : adminOnly ? "admin" : "public";
  const route = process.env.GENERATION_PROVIDER?.trim() as ProviderRoute | undefined;
  const hasVast = Boolean(
    process.env.VAST_COMFY_BASE_URL?.trim()
      || Object.values(vastEndpointVariables).some((key) => process.env[key]?.trim())
      || (process.env.VAST_API_KEY?.trim() && (
        process.env.VAST_SERVERLESS_ENDPOINT?.trim()
        || process.env.VAST_LIVEPORTRAIT_SERVERLESS_ENDPOINT?.trim()
        || Object.values(vastServerlessEndpointVariables).some((key) => process.env[key]?.trim())
      )),
  );
  const serverlessMinLoad = Number(process.env.VAST_SERVERLESS_MIN_LOAD ?? 0);
  const serverlessColdWorkers = Number(process.env.VAST_SERVERLESS_COLD_WORKERS ?? 0);
  const serverlessMaxWorkers = Number(process.env.VAST_SERVERLESS_MAX_WORKERS ?? 1);
  const serverlessInactivityTimeoutSeconds = Number(process.env.VAST_SERVERLESS_INACTIVITY_TIMEOUT_SECONDS ?? 600);
  const requestedBillingMode = process.env.GENERATION_BILLING_MODE?.trim().toLowerCase();
  const billingMode: GenerationBillingMode = requestedBillingMode === "live" ? "live" : "shadow";
  const testBudgetUsd = Number(process.env.VAST_TEST_BUDGET_USD ?? 0);
  const testMaxJobs = Number(process.env.VAST_TEST_MAX_JOBS ?? 0);
  const testMaxEstimatedJobUsd = Number(process.env.VAST_TEST_MAX_ESTIMATED_JOB_USD ?? 0);
  const testModality = process.env.VAST_TEST_MODALITY?.trim();
  const testSessionBudgetUsd = Number(process.env.VAST_TEST_SESSION_BUDGET_USD ?? 0);
  const testReserveUsd = Number(process.env.VAST_TEST_RESERVE_USD ?? 0.40);
  const testSessionId = process.env.VAST_TEST_SESSION_ID?.trim();

  return {
    enabled,
    adminOnly: accessMode === "admin",
    accessMode,
    billingMode,
    route: route === "vast" || route === "fake" ? route : null,
    hasVast,
    vastQueueThreshold: Number(process.env.VAST_QUEUE_THRESHOLD ?? 50),
    vastDebugIdleShutdownMinutes: Math.max(Number(process.env.VAST_DEBUG_IDLE_SHUTDOWN_MINUTES ?? 10), 1),
    vastServerless: {
      minLoad: serverlessMinLoad,
      coldWorkers: serverlessColdWorkers,
      maxWorkers: serverlessMaxWorkers,
      inactivityTimeoutSeconds: serverlessInactivityTimeoutSeconds,
      safe: serverlessMinLoad === 0
        && serverlessColdWorkers === 0
        && serverlessMaxWorkers === 1
        && serverlessInactivityTimeoutSeconds === 600,
    },
    maxAttempts: Math.min(Math.max(Number(process.env.GENERATION_MAX_ATTEMPTS ?? 3), 1), 10),
    workerConcurrency: Math.max(Number(process.env.WORKER_CONCURRENCY ?? 1), 1),
    requestTimeoutMs: Math.max(Number(process.env.VAST_REQUEST_TIMEOUT_MS ?? 15_000), 1_000),
    jobTimeoutSeconds: Math.max(Number(process.env.GENERATION_JOB_TIMEOUT_SECONDS ?? 600), 30),
    redisConfigured: Boolean(process.env.REDIS_URL?.trim()),
    vastTest: {
      enabled: Number.isFinite(testBudgetUsd) && testBudgetUsd > 0 && Number.isInteger(testMaxJobs) && testMaxJobs > 0,
      budgetUsd: Number.isFinite(testBudgetUsd) && testBudgetUsd > 0 ? testBudgetUsd : 0,
      maxJobs: Number.isInteger(testMaxJobs) && testMaxJobs > 0 ? testMaxJobs : 0,
      maxEstimatedJobUsd: Number.isFinite(testMaxEstimatedJobUsd) && testMaxEstimatedJobUsd > 0 ? testMaxEstimatedJobUsd : 0,
      modality: isGenerationProviderKind(testModality ?? "") ? testModality as GenerationProviderKind : null,
      runId: process.env.VAST_TEST_RUN_ID?.trim() || null,
      session: {
        enabled: Boolean(testSessionId) && Number.isFinite(testSessionBudgetUsd) && testSessionBudgetUsd > 0,
        id: testSessionId || null,
        budgetUsd: Number.isFinite(testSessionBudgetUsd) && testSessionBudgetUsd > 0 ? testSessionBudgetUsd : 0,
        reserveUsd: Number.isFinite(testReserveUsd) && testReserveUsd >= 0 ? testReserveUsd : 0.40,
      },
    },
  };
}

export function isGenerationConfigured() {
  const config = getGenerationConfig();
  return config.enabled && (config.route === "fake" || (config.route === "vast" && config.hasVast && config.vastServerless.safe));
}

export function isGenerationRouteConfigured(input: { providerRoute: ProviderRoute; workflowVersion: string }) {
  const config = getGenerationConfig();
  if (!config.enabled) return false;
  if (!isGenerationSafetyConfigured()) return false;
  if (input.providerRoute === "fake") return process.env.NODE_ENV === "test";
  const workflowKind = input.workflowVersion.split("/", 1)[0];
  const kind = workflowKind === "characters" ? "character" : workflowKind === "worlds" ? "world" : workflowKind;
  return config.vastServerless.safe
    && isGenerationProviderKind(kind)
    && Boolean(getVastComfyBaseUrl(kind) || getVastServerlessEndpointName(kind, input.workflowVersion))
    && isWorkflowConfigured(input.workflowVersion);
}

/** Beta safety gates fail closed when they are explicitly required. */
export function isGenerationSafetyConfigured() {
  const auditRequired = process.env.GENERATION_REQUIRE_AUDIT === "true";
  const auditConfigured = process.env.GENERATION_AUDIT_ENABLED === "true"
    && Boolean(process.env.MODERATION_AUDIT_SALT?.trim());
  if (auditRequired && !auditConfigured) return false;

  const provenanceRequired = process.env.GENERATION_REQUIRE_PROVENANCE === "true";
  if (provenanceRequired && !process.env.PROVENANCE_SIGNING_KEY?.trim()) return false;

  const l2Required = process.env.GENERATION_MODERATION_LEVEL?.trim().toLowerCase() === "l2";
  if (l2Required && (
    process.env.GENERATION_MODERATION_PROVIDER !== "openrouter"
    || !process.env.OPENROUTER_API_KEY?.trim()
    || !process.env.GENERATION_MODERATION_MODEL?.trim()
  )) return false;

  return true;
}

export function isGenerationEnabled() {
  return getGenerationConfig().enabled;
}

export function getVastComfyBaseUrl(kind?: GenerationProviderKind) {
  const specific = kind ? process.env[vastEndpointVariables[kind]]?.trim() : undefined;
  return specific || process.env.VAST_COMFY_BASE_URL?.trim() || null;
}

export function getVastServerlessEndpointName(kind?: GenerationProviderKind, workflowVersion?: string) {
  if (workflowVersion === "characters/liveportrait-v1") {
    return process.env.VAST_LIVEPORTRAIT_SERVERLESS_ENDPOINT?.trim()
      || (kind ? process.env[vastServerlessEndpointVariables[kind]]?.trim() : undefined)
      || process.env.VAST_SERVERLESS_ENDPOINT?.trim()
      || null;
  }
  const specific = kind ? process.env[vastServerlessEndpointVariables[kind]]?.trim() : undefined;
  return specific || process.env.VAST_SERVERLESS_ENDPOINT?.trim() || null;
}

export function assertSafeVastServerlessConfig() {
  const config = getGenerationConfig();
  if (!config.vastServerless.safe) {
    throw new Error("Vast.ai Serverless debe usar min_load=0, cold_workers=0, max_workers=1 e inactivity_timeout=600.");
  }
}

export function getEstimatedVastCostRate(kind: GenerationProviderKind) {
  const specific = process.env[`VAST_${kind.toUpperCase()}_ESTIMATED_USD_PER_GPU_SECOND`]?.trim();
  const fallback = process.env.VAST_ESTIMATED_USD_PER_GPU_SECOND?.trim();
  const rate = Number(specific || fallback || 0);
  return Number.isFinite(rate) && rate >= 0 ? rate : 0;
}

function isGenerationProviderKind(value: string): value is GenerationProviderKind {
  return ["image", "video", "audio", "character", "world"].includes(value);
}
