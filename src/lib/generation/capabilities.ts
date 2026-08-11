import { getGenerationConfig, type GenerationProviderKind } from "./config";
import { isWorkflowConfigured } from "./workflows";

export type GenerationCapabilityStatus =
  | "configured"
  | "contract_only"
  | "disabled"
  | "admin_only"
  | "beta";

export interface GenerationCapability {
  id: string;
  label: string;
  kind: GenerationProviderKind;
  workflowVersion: string;
  model: string;
  operation?: string;
  status: GenerationCapabilityStatus;
  workflowConfigured: boolean;
}

const capabilityCatalog: Array<Omit<GenerationCapability, "status" | "workflowConfigured">> = [
  { id: "image-flux-schnell", label: "Flux Schnell", kind: "image", model: "flux-schnell", workflowVersion: "image/flux-schnell-v1" },
  { id: "image-flux-dev", label: "Flux Dev", kind: "image", model: "flux-dev", workflowVersion: "image/flux-dev-v1" },
  { id: "character-flux-reference", label: "Flux con referencias", kind: "character", model: "flux-schnell-reference", workflowVersion: "characters/flux-reference-v1" },
  { id: "world-flux", label: "Flux World", kind: "world", model: "flux-schnell-world", workflowVersion: "worlds/flux-world-v1" },
  { id: "audio-f5-tts-es", label: "F5-TTS español", kind: "audio", model: "f5-tts-es", operation: "tts", workflowVersion: "audio/f5-tts-es-v1" },
  { id: "audio-rvc", label: "RVC", kind: "audio", model: "rvc", operation: "voice_changer", workflowVersion: "audio/rvc-v1" },
  ...(["t2v", "i2v", "v2v", "upscale", "lip-sync", "extend"] as const).map((operation) => ({
    id: `video-hunyuan-8.3b-${operation}`,
    label: `HunyuanVideo 8.3B · ${operation}`,
    kind: "video" as const,
    model: "hunyuan-video-1.5-8.3b",
    operation,
    workflowVersion: `video/hunyuan-8.3b-${operation}-v1`,
  })),
];

export function listGenerationCapabilities(): GenerationCapability[] {
  const config = getGenerationConfig();
  return capabilityCatalog.map((capability) => {
    const workflowConfigured = isWorkflowConfigured(capability.workflowVersion);
    return {
      ...capability,
      workflowConfigured,
      status: resolveCapabilityStatus(workflowConfigured, config.enabled, config.accessMode),
    };
  });
}

export function getGenerationCapability(id: string) {
  return listGenerationCapabilities().find((capability) => capability.id === id) ?? null;
}

function resolveCapabilityStatus(
  workflowConfigured: boolean,
  enabled: boolean,
  accessMode: "admin" | "allowlist" | "public",
): GenerationCapabilityStatus {
  if (!workflowConfigured) return "contract_only";
  if (!enabled) return "disabled";
  if (accessMode === "admin") return "admin_only";
  if (accessMode === "allowlist") return "beta";
  return "configured";
}
