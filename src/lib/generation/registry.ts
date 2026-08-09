import type { ProviderRoute } from "./config";

export interface GenerationRouteSpec {
  publicModel: string;
  backendModel: string;
  workflowVersion: string;
  operation?: string;
  providerRoute: ProviderRoute;
  credits: number;
}

function configuredRoute(): ProviderRoute {
  const requested = process.env.GENERATION_PROVIDER;
  if (requested === "runpod") return "runpod";
  if (requested === "fake") return "fake";
  return "vast";
}

export function resolveImageRoute(model: string): GenerationRouteSpec {
  const premium = model === "flux-1-dev" || model === "flux-dev";
  return {
    publicModel: model,
    backendModel: premium ? "flux-dev" : "flux-schnell",
    workflowVersion: premium ? "image/flux-dev-v1" : "image/flux-schnell-v1",
    providerRoute: configuredRoute(),
    credits: 1,
  };
}

export function resolveVideoRoute(operation: string, model: string): GenerationRouteSpec {
  const premium = model.includes("13b") || model.includes("premium") || model.includes("pro");
  return {
    publicModel: model,
    backendModel: premium ? "hunyuan-video-13b" : "hunyuan-video-8.3b",
    workflowVersion: premium ? "video/hunyuan-13b-v1" : "video/hunyuan-8b-v1",
    operation,
    providerRoute: configuredRoute(),
    credits: 80,
  };
}

export function resolveCharacterRoute(model: string): GenerationRouteSpec {
  const premium = model === "flux-1-dev" || model === "kling-3-omni";
  return {
    publicModel: model,
    backendModel: premium ? "flux-dev-reference" : "flux-schnell-reference",
    workflowVersion: "characters/flux-reference-v1",
    providerRoute: configuredRoute(),
    credits: 0,
  };
}

export function resolveWorldRoute(model: string): GenerationRouteSpec {
  return {
    publicModel: model,
    backendModel: model === "flux-1-dev" ? "flux-dev-world" : "flux-schnell-world",
    workflowVersion: "worlds/flux-world-v1",
    providerRoute: configuredRoute(),
    credits: 0,
  };
}

export function resolveAudioRoute(kind: string, model = "f5-tts") {
  return {
    publicModel: model,
    backendModel: kind === "voice_changer" ? "rvc" : "f5-tts-es",
    workflowVersion: kind === "voice_changer" ? "audio/rvc-v1" : "audio/f5-tts-es-v1",
    providerRoute: configuredRoute(),
    credits: 0,
  } satisfies Omit<GenerationRouteSpec, "operation">;
}
