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
  backendModel: string;
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
  {
    id: "image-flux2-klein-4b-v1",
    label: "FLUX.2 Klein 4B",
    backendModel: "flux2-klein-4b",
    workflowVersion: "image/flux2-klein-4b-v1",
    sourceUrl: "https://bfl.ai/models/flux-2-klein",
    license: "Apache 2.0",
    licenseUrl: "https://bfl.ai/models/flux-2-klein",
    licenseNote: "Uso local privado; fijar la variante y revisar los avisos del release antes de cualquier publicación.",
    minimumVramGb: 13,
    capabilities: ["text-to-image", "1k", "edición", "referencias"],
    entitlementRequired: "admin",
    estimatedCostUsd: 0.06,
    estimatedLatencySeconds: 35,
  },
  {
    id: "image-z-image-v1",
    label: "Z-Image",
    backendModel: "z-image",
    workflowVersion: "image/z-image-v1",
    sourceUrl: "https://github.com/Tongyi-MAI/Z-Image",
    license: "Apache 2.0 declarada por el proyecto",
    licenseUrl: "https://github.com/Tongyi-MAI/Z-Image",
    licenseNote: "Mantener el release y los hashes del vault; aún requiere validación de workflow.",
    minimumVramGb: 12,
    capabilities: ["text-to-image", "1k", "retratos"],
    entitlementRequired: "admin",
    estimatedCostUsd: 0.06,
    estimatedLatencySeconds: 35,
  },
  {
    id: "image-qwen-image-v1",
    label: "Qwen-Image oficial",
    backendModel: "qwen-image",
    workflowVersion: "image/qwen-image-v1",
    sourceUrl: "https://github.com/QwenLM/Qwen-Image",
    license: "Apache 2.0",
    licenseUrl: "https://github.com/QwenLM/Qwen-Image",
    licenseNote: "Modelo pesado; exige endpoint de alta VRAM u optimización validada antes del smoke.",
    minimumVramGb: 48,
    capabilities: ["text-to-image", "1k", "texto en imagen", "edición"],
    entitlementRequired: "admin",
    estimatedCostUsd: 0.45,
    estimatedLatencySeconds: 180,
  },
  {
    id: "image-flux2-klein-9b-v1",
    label: "FLUX.2 Klein 9B",
    backendModel: "flux2-klein-9b",
    workflowVersion: "image/flux2-klein-9b-v1",
    sourceUrl: "https://bfl.ai/models/flux-2-klein",
    license: "FLUX Non-Commercial para pesos locales",
    licenseUrl: "https://bfl.ai/models/flux-2-klein",
    licenseNote: "Sólo investigación privada hasta cerrar licencia comercial o ruta API aprobada.",
    minimumVramGb: 24,
    capabilities: ["text-to-image", "1k", "edición", "referencias"],
    entitlementRequired: "admin",
    estimatedCostUsd: 0.12,
    estimatedLatencySeconds: 60,
  },
  {
    id: "image-juggernaut-xl-v1",
    label: "Juggernaut XL",
    backendModel: "juggernaut-xl",
    workflowVersion: "image/juggernaut-xl-v1",
    sourceUrl: "https://www.rundiffusion.com/juggernaut-xl",
    license: "Licencia comercial separada",
    licenseUrl: "https://www.rundiffusion.com/juggernaut-xl",
    licenseNote: "Evaluación privada; requiere permiso escrito para hosting externo o servicio pagado.",
    minimumVramGb: 12,
    capabilities: ["text-to-image", "1k", "fotorealismo"],
    entitlementRequired: "admin",
    estimatedCostUsd: 0.05,
    estimatedLatencySeconds: 30,
  },
  {
    id: "image-dynavision-xl-v1",
    label: "DynaVision XL",
    backendModel: "dynavision-xl",
    workflowVersion: "image/dynavision-xl-v1",
    sourceUrl: "https://civitai.com/models/122606",
    license: "Permisos Civitai insuficientes para SaaS externo",
    licenseUrl: "https://civitai.com/models/122606",
    licenseNote: "Sólo investigación privada; no servirlo comercialmente sin permiso escrito.",
    minimumVramGb: 12,
    capabilities: ["text-to-image", "1k", "estilizado"],
    entitlementRequired: "admin",
    estimatedCostUsd: 0.05,
    estimatedLatencySeconds: 30,
  },
  {
    id: "image-wai-ani-ponyxl-v1",
    label: "WAI-ANI PonyXL",
    backendModel: "wai-ani-ponyxl",
    workflowVersion: "image/wai-ani-ponyxl-v1",
    sourceUrl: "https://civitai.com/models/553648",
    license: "Permisos Civitai insuficientes para SaaS externo",
    licenseUrl: "https://civitai.com/models/553648",
    licenseNote: "Aislado para investigación y moderación; nunca se ofrece públicamente.",
    minimumVramGb: 12,
    capabilities: ["text-to-image", "1k", "anime"],
    entitlementRequired: "admin",
    estimatedCostUsd: 0.05,
    estimatedLatencySeconds: 30,
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
