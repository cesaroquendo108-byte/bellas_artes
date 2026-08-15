import { getGenerationConfig, type GenerationProviderKind } from "./config";
import { IMAGE_MODEL_CATALOG, listImageModelCatalog, type ImageModelCatalogStatus } from "./model-catalog";
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
  realWorkflowConfigured: boolean;
  catalogStatus?: ImageModelCatalogStatus;
  sourceUrl?: string;
  license?: string;
  minimumVramGb?: number;
  estimatedCostUsd?: number;
  estimatedLatencySeconds?: number;
}

type CapabilityDefinition = Omit<GenerationCapability, "status" | "workflowConfigured" | "realWorkflowConfigured">;

const capabilityCatalog: CapabilityDefinition[] = [
  ...IMAGE_MODEL_CATALOG.map((entry) => ({
    id: entry.id,
    label: entry.label,
    kind: "image" as const,
    model: entry.backendModel,
    workflowVersion: entry.workflowVersion,
    sourceUrl: entry.sourceUrl,
    license: entry.license,
    minimumVramGb: entry.minimumVramGb,
    estimatedCostUsd: entry.estimatedCostUsd,
    estimatedLatencySeconds: entry.estimatedLatencySeconds,
  })),
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
  ...(["t2v", "i2v"] as const).map((operation) => ({
    id: `video-wan22-ti2v-5b-${operation}`,
    label: `Wan 2.2 TI2V-5B · ${operation}`,
    kind: "video" as const,
    model: "wan22-ti2v-5b",
    operation,
    workflowVersion: `video/wan22-ti2v-5b-${operation}-v1`,
  })),
  ...(["t2v", "i2v"] as const).map((operation) => ({
    id: `video-hunyuan-1.5-8.3b-${operation}`,
    label: `HunyuanVideo 1.5 8.3B · ${operation}`,
    kind: "video" as const,
    model: "hunyuan-video-1.5-8.3b",
    operation,
    workflowVersion: `video/hunyuan-8.3b-${operation}-v1`,
  })),
  ...(["t2v", "i2v"] as const).map((operation) => ({
    id: `video-hunyuan-original-${operation}`,
    label: `HunyuanVideo original · ${operation}`,
    kind: "video" as const,
    model: "hunyuan-video-original",
    operation,
    workflowVersion: `video/hunyuan-original-${operation}-v1`,
  })),
];

export function listGenerationCapabilities(): GenerationCapability[] {
  const config = getGenerationConfig();
  const imageCatalog = new Map(listImageModelCatalog().map((entry) => [entry.id, entry]));
  return capabilityCatalog.map((capability) => {
    const workflowConfigured = isWorkflowConfigured(capability.workflowVersion);
    const catalogEntry = capability.kind === "image" ? imageCatalog.get(capability.id) : undefined;
    return {
      ...capability,
      workflowConfigured,
      realWorkflowConfigured: workflowConfigured,
      catalogStatus: catalogEntry?.status,
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
