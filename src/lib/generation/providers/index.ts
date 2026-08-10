import { getGenerationConfig, type GenerationProviderKind } from "../config";
import { ComfyUIProvider } from "./comfyui";
import { ProviderError, type GenerationProvider } from "./types";

export function getProvider(route = getGenerationConfig().route, kind?: GenerationProviderKind): GenerationProvider {
  if (route === "vast") return new ComfyUIProvider(kind);
  throw new Error("No hay un proveedor de generación configurado.");
}

export async function selectProvider(input: { kind: GenerationProviderKind }) {
  const config = getGenerationConfig();
  const vast = new ComfyUIProvider(input.kind);

  if (!config.vastServerless.safe) throw new ProviderError("VAST_SERVERLESS_COST_GUARD", "VAST_SERVERLESS_COST_GUARD", false);
  if (!config.hasVast || !await vast.health()) throw new ProviderError("VAST_UNAVAILABLE", "VAST_UNAVAILABLE", true);
  if (await vast.queueDepth() > config.vastQueueThreshold) throw new ProviderError("VAST_QUEUE_BUSY", "VAST_QUEUE_BUSY", true);
  return vast;
}

export { ComfyUIProvider };
export * from "./types";
