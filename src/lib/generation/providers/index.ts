import { getGenerationConfig, type GenerationProviderKind } from "../config";
import { getModelRuntimeEntryForBackendModel } from "../model-runtime-catalog";
import { ComfyUIProvider } from "./comfyui";
import { NativeHttpProvider } from "./native-http";
import { ProviderError, type GenerationProvider } from "./types";

export function getProvider(
  route = getGenerationConfig().route,
  kind?: GenerationProviderKind,
  backendModel?: string,
): GenerationProvider {
  if (route === "vast") return createVastProvider(kind, backendModel);
  throw new Error("No hay un proveedor de generación configurado.");
}

export async function selectProvider(input: { kind: GenerationProviderKind; backendModel?: string }) {
  const config = getGenerationConfig();
  const vast = createVastProvider(input.kind, input.backendModel);

  if (!config.vastServerless.safe) throw new ProviderError("VAST_SERVERLESS_COST_GUARD", "VAST_SERVERLESS_COST_GUARD", false);
  if (!config.hasVast || !await vast.health()) throw new ProviderError("VAST_UNAVAILABLE", "VAST_UNAVAILABLE", true);
  if (await vast.queueDepth() > config.vastQueueThreshold) throw new ProviderError("VAST_QUEUE_BUSY", "VAST_QUEUE_BUSY", true);
  return vast;
}

function createVastProvider(kind?: GenerationProviderKind, backendModel?: string): GenerationProvider {
  const engine = backendModel
    ? getModelRuntimeEntryForBackendModel(backendModel)?.engine
    : "comfyui-api";
  if (engine === "native-api") {
    if (!kind) throw new ProviderError("La modalidad nativa no está definida.", "NATIVE_KIND_MISSING", false);
    return new NativeHttpProvider(kind, backendModel);
  }
  if (engine !== "comfyui-api") {
    throw new ProviderError("El modelo no es un generador ejecutable.", "MODEL_ENGINE_UNSUPPORTED", false);
  }
  return new ComfyUIProvider(kind);
}

export { ComfyUIProvider, NativeHttpProvider };
export * from "./types";
