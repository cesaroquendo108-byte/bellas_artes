import { getGenerationConfig } from "./config";
import { isWorkflowConfigured } from "./workflows";

export type ImageModelCatalogStatus =
  | "preparing"
  | "admin_only"
  | "beta"
  | "configured"
  | "disabled";

export interface ImageModelCatalogEntry {
  id: string;
  label: string;
  backendModel: "flux-schnell" | "flux-dev" | "pixart-sigma" | "sd35-medium";
  workflowVersion: string;
  sourceUrl: string;
  license: string;
  licenseUrl: string;
  licenseNote: string;
  minimumVramGb: number;
  capabilities: readonly ["text-to-image", ...string[]];
  entitlementRequired: "admin" | "pro_b2b";
  estimatedCostUsd: number;
  estimatedLatencySeconds: number;
  realWorkflowConfigured: boolean;
  status: ImageModelCatalogStatus;
}

export const IMAGE_MODEL_CATALOG = [
  {
    id: "image-flux-schnell",
    label: "Flux Schnell",
    backendModel: "flux-schnell",
    workflowVersion: "image/flux-schnell-v1",
    sourceUrl: "https://huggingface.co/black-forest-labs/FLUX.1-schnell",
    license: "Apache 2.0",
    licenseUrl: "https://huggingface.co/black-forest-labs/FLUX.1-schnell",
    licenseNote: "Modelo abierto; la inferencia GPU y el almacenamiento sí generan coste.",
    minimumVramGb: 24,
    capabilities: ["text-to-image", "1k", "2k"],
    entitlementRequired: "admin",
    estimatedCostUsd: 0.1,
    estimatedLatencySeconds: 45,
  },
  {
    id: "image-flux-dev",
    label: "Flux Dev",
    backendModel: "flux-dev",
    workflowVersion: "image/flux-dev-v1",
    sourceUrl: "https://huggingface.co/black-forest-labs/FLUX.1-dev",
    license: "Flux Dev License",
    licenseUrl: "https://huggingface.co/black-forest-labs/FLUX.1-dev",
    licenseNote: "Requiere revisión de términos y endpoint premium antes de uso comercial.",
    minimumVramGb: 48,
    capabilities: ["text-to-image", "1k", "2k"],
    entitlementRequired: "pro_b2b",
    estimatedCostUsd: 0.2,
    estimatedLatencySeconds: 90,
  },
  {
    id: "image-pixart-sigma-v1",
    label: "PixArt-Sigma",
    backendModel: "pixart-sigma",
    workflowVersion: "image/pixart-sigma-v1",
    sourceUrl: "https://github.com/PixArt-alpha/PixArt-sigma",
    license: "Apache 2.0",
    licenseUrl: "https://github.com/PixArt-alpha/PixArt-sigma/blob/master/LICENSE",
    licenseNote: "Modelo abierto de 0.6B parámetros; la disponibilidad depende del workflow y la VRAM.",
    minimumVramGb: 16,
    capabilities: ["text-to-image", "1k"],
    entitlementRequired: "admin",
    estimatedCostUsd: 0.04,
    estimatedLatencySeconds: 25,
  },
  {
    id: "image-sd35-medium-v1",
    label: "Stable Diffusion 3.5 Medium",
    backendModel: "sd35-medium",
    workflowVersion: "image/sd35-medium-v1",
    sourceUrl: "https://huggingface.co/stabilityai/stable-diffusion-3.5-medium",
    license: "Stability AI Community License",
    licenseUrl: "https://huggingface.co/stabilityai/stable-diffusion-3.5-medium",
    licenseNote: "Descarga gated; la elegibilidad y los términos comerciales deben revisarse antes de publicar.",
    minimumVramGb: 24,
    capabilities: ["text-to-image", "1k", "texto en imagen"],
    entitlementRequired: "admin",
    estimatedCostUsd: 0.08,
    estimatedLatencySeconds: 50,
  },
] as const satisfies readonly Omit<ImageModelCatalogEntry, "realWorkflowConfigured" | "status">[];

export function listImageModelCatalog(): ImageModelCatalogEntry[] {
  const config = getGenerationConfig();

  return IMAGE_MODEL_CATALOG.map((entry) => {
    const realWorkflowConfigured = isWorkflowConfigured(entry.workflowVersion);
    return {
      ...entry,
      realWorkflowConfigured,
      status: resolveImageModelStatus(realWorkflowConfigured, config.enabled, config.accessMode),
    };
  });
}

export function getImageModelCatalogEntry(id: string) {
  return listImageModelCatalog().find((entry) => entry.id === id) ?? null;
}

function resolveImageModelStatus(
  realWorkflowConfigured: boolean,
  enabled: boolean,
  accessMode: "admin" | "allowlist" | "public",
): ImageModelCatalogStatus {
  if (!realWorkflowConfigured) return "preparing";
  if (!enabled) return "disabled";
  if (accessMode === "admin") return "admin_only";
  if (accessMode === "allowlist") return "beta";
  return "configured";
}
