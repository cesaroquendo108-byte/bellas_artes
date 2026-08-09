export type ProviderRoute = "vast" | "runpod" | "fake";

function truthy(value: string | undefined) {
  return value === "1" || value?.toLowerCase() === "true";
}

export function getGenerationConfig() {
  const enabled = truthy(process.env.GENERATION_ENABLED);
  const route = process.env.GENERATION_PROVIDER?.trim() as ProviderRoute | undefined;
  const hasVast = Boolean(process.env.VAST_COMFY_BASE_URL?.trim());
  const hasRunPod = Boolean(process.env.RUNPOD_API_KEY?.trim() && (process.env.RUNPOD_ENDPOINT_ID?.trim() || process.env.RUNPOD_IMAGE_ENDPOINT_ID?.trim() || process.env.RUNPOD_VIDEO_ENDPOINT_ID?.trim() || process.env.RUNPOD_AUDIO_ENDPOINT_ID?.trim() || process.env.RUNPOD_CHARACTER_ENDPOINT_ID?.trim() || process.env.RUNPOD_WORLD_ENDPOINT_ID?.trim()));

  return {
    enabled,
    route: route === "vast" || route === "runpod" || route === "fake" ? route : null,
    hasVast,
    hasRunPod,
    vastQueueThreshold: Number(process.env.VAST_QUEUE_THRESHOLD ?? 50),
    maxAttempts: Math.min(Math.max(Number(process.env.GENERATION_MAX_ATTEMPTS ?? 3), 1), 10),
    workerConcurrency: Math.max(Number(process.env.WORKER_CONCURRENCY ?? 1), 1),
    redisConfigured: Boolean(process.env.REDIS_URL?.trim()),
  };
}

export function isGenerationConfigured() {
  const config = getGenerationConfig();
  return config.enabled && (config.route === "fake" || config.hasVast || config.hasRunPod);
}

export function isGenerationRouteConfigured(input: { providerRoute: ProviderRoute; workflowVersion: string }) {
  const config = getGenerationConfig();
  if (!config.enabled) return false;
  if (input.providerRoute === "fake") return process.env.NODE_ENV === "test";
  if (input.providerRoute === "runpod") return config.hasRunPod;
  const workflowKey = `WORKFLOW_${input.workflowVersion.replace(/[^a-zA-Z0-9]/g, "_").toUpperCase()}`;
  return config.hasVast && Boolean(process.env[workflowKey]?.trim());
}

export function isGenerationEnabled() {
  return getGenerationConfig().enabled;
}
