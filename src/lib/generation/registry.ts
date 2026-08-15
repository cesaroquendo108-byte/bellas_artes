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
  const imageRoutes: Record<string, { backendModel: string; workflowVersion: string }> = {
    "flux-schnell": { backendModel: "flux-schnell", workflowVersion: "image/flux-schnell-v1" },
    "flux-dev": { backendModel: "flux-dev", workflowVersion: "image/flux-dev-v1" },
    "pixart-sigma": { backendModel: "pixart-sigma", workflowVersion: "image/pixart-sigma-v1" },
    "sd35-medium": { backendModel: "sd35-medium", workflowVersion: "image/sd35-medium-v1" },
    "flux2-klein-4b": { backendModel: "flux2-klein-4b", workflowVersion: "image/flux2-klein-4b-v1" },
    "z-image": { backendModel: "z-image", workflowVersion: "image/z-image-v1" },
    "qwen-image": { backendModel: "qwen-image", workflowVersion: "image/qwen-image-v1" },
    "flux2-klein-9b": { backendModel: "flux2-klein-9b", workflowVersion: "image/flux2-klein-9b-v1" },
    "juggernaut-xl": { backendModel: "juggernaut-xl", workflowVersion: "image/juggernaut-xl-v1" },
    "dynavision-xl": { backendModel: "dynavision-xl", workflowVersion: "image/dynavision-xl-v1" },
    "wai-ani-ponyxl": { backendModel: "wai-ani-ponyxl", workflowVersion: "image/wai-ani-ponyxl-v1" },
  };
  const route = imageRoutes[model] ?? imageRoutes["flux-schnell"];
  return {
    publicModel: model in imageRoutes ? model : "flux-schnell",
    backendModel: route.backendModel,
    workflowVersion: route.workflowVersion,
    providerRoute: configuredRoute(),
    credits: getGenerationCreditCost("image", params, route.backendModel),
  };
}

export function resolveVideoRoute(operation: string, model: string, params?: Record<string, unknown>): GenerationRouteSpec {
  if (model === "wan22-ti2v-5b") {
    return {
      publicModel: model,
      backendModel: "wan22-ti2v-5b",
      workflowVersion: `video/wan22-ti2v-5b-${operation}-v1`,
      operation,
      providerRoute: configuredRoute(),
      credits: getGenerationCreditCost("video", params, "wan22-ti2v-5b"),
    };
  }
  if (model === "hunyuan-video-original") {
    return {
      publicModel: model,
      backendModel: "hunyuan-video-original",
      workflowVersion: `video/hunyuan-original-${operation}-v1`,
      operation,
      providerRoute: configuredRoute(),
      credits: getGenerationCreditCost("video", params, "hunyuan-video-original"),
    };
  }
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
