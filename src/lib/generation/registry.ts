import type { ProviderRoute } from "./config";
import { getGenerationCreditCost } from "./rates";

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
  if (requested === "fake") return "fake";
  return "vast";
}

export function resolveImageRoute(model: string, params?: Record<string, unknown>): GenerationRouteSpec {
  const premium = model === "flux-dev";
  const backendModel = premium ? "flux-dev" : "flux-schnell";
  return {
    publicModel: premium ? "flux-dev" : "flux-schnell",
    backendModel,
    workflowVersion: premium ? "image/flux-dev-v1" : "image/flux-schnell-v1",
    providerRoute: configuredRoute(),
    credits: getGenerationCreditCost("image", params, backendModel),
  };
}

export function resolveVideoRoute(operation: string, model: string, params?: Record<string, unknown>): GenerationRouteSpec {
  const premium = model.includes("13b") || model.includes("premium") || model.includes("pro");
  const backendModel = premium ? "hunyuan-video-13b" : "hunyuan-video-8.3b";
  const workflowModel = premium ? "hunyuan-13b" : "hunyuan-8.3b";
  return {
    publicModel: model,
    backendModel,
    workflowVersion: `video/${workflowModel}-${operation}-v1`,
    operation,
    providerRoute: configuredRoute(),
    credits: getGenerationCreditCost("video", params, backendModel),
  };
}

export function resolveCharacterRoute(model: string, params?: Record<string, unknown>): GenerationRouteSpec {
  const premium = model === "flux-dev-reference";
  const backendModel = premium ? "flux-dev-reference" : "flux-schnell-reference";
  return {
    publicModel: premium ? "flux-dev-reference" : "flux-schnell-reference",
    backendModel,
    workflowVersion: "characters/flux-reference-v1",
    providerRoute: configuredRoute(),
    credits: getGenerationCreditCost("character", params, backendModel),
  };
}

export function resolveWorldRoute(model: string, params?: Record<string, unknown>): GenerationRouteSpec {
  const premium = model === "flux-dev-world";
  const backendModel = premium ? "flux-dev-world" : "flux-schnell-world";
  return {
    publicModel: backendModel,
    backendModel,
    workflowVersion: "worlds/flux-world-v1",
    providerRoute: configuredRoute(),
    credits: getGenerationCreditCost("world", params, backendModel),
  };
}

export function resolveLivePortraitRoute(params?: Record<string, unknown>): GenerationRouteSpec {
  return {
    publicModel: "liveportrait",
    backendModel: "liveportrait",
    workflowVersion: "characters/liveportrait-v1",
    operation: "liveportrait",
    providerRoute: configuredRoute(),
    credits: getGenerationCreditCost("character", params, "liveportrait"),
  };
}

export function resolveAudioRoute(kind: string, model = "f5-tts", params?: Record<string, unknown>) {
  const backendModel = kind === "voice_changer" ? "rvc" : kind === "tts" ? "f5-tts-es" : "ffmpeg-mix";
  const workflowVersion = kind === "voice_changer"
    ? "audio/rvc-v1"
    : kind === "tts"
      ? "audio/f5-tts-es-v1"
      : "audio/mix-v1";
  return {
    publicModel: model,
    backendModel,
    workflowVersion,
    operation: kind,
    providerRoute: configuredRoute(),
    credits: getGenerationCreditCost("audio", params, backendModel),
  } satisfies GenerationRouteSpec;
}
