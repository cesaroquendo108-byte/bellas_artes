import { getGenerationConfig } from "../config";
import { ComfyUIProvider } from "./comfyui";
import { RunPodProvider } from "./runpod";
import type { GenerationProvider } from "./types";

export function getProvider(route = getGenerationConfig().route): GenerationProvider {
  if (route === "runpod") return new RunPodProvider();
  if (route === "vast") return new ComfyUIProvider();
  throw new Error("No hay un proveedor de generación configurado.");
}

export async function selectProvider(input: { preferred: "vast" | "runpod"; kind: "image" | "video" | "audio" | "character" | "world" }) {
  const config = getGenerationConfig();
  const vast = new ComfyUIProvider();
  const runpod = new RunPodProvider();
  const runpodConfigured = Boolean(process.env.RUNPOD_API_KEY?.trim() && (process.env.RUNPOD_ENDPOINT_ID?.trim() || process.env[`RUNPOD_${input.kind.toUpperCase()}_ENDPOINT_ID`]?.trim()));

  if (input.preferred === "vast" && config.hasVast && await vast.health() && await vast.queueDepth() <= config.vastQueueThreshold) return vast;
  if (runpodConfigured && await runpod.health()) return runpod;
  if (config.hasVast && await vast.health()) return vast;
  throw new Error("Ningún proveedor de generación está saludable.");
}

export { ComfyUIProvider, RunPodProvider };
export * from "./types";
