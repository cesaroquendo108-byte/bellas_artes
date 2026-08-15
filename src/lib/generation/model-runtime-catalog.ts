import installState from "../../../infra/models/model-install-state.json";

import { ADMIN_MODEL_BENCHMARK, type ModelBenchmarkCategory } from "@/lib/admin/model-benchmark";
import { isWorkflowConfigured } from "./workflows";

export type ModelRuntimeRole = "generator" | "component" | "postprocess" | "dependency";
export type ModelRuntimePolicy = "admin_smoke" | "admin_research" | "component_only" | "replaced";
export type ModelRuntimeStatus =
  | "workflow_ready"
  | "workflow_pending"
  | "component_pending"
  | "research_only"
  | "replaced";

export interface ModelRuntimeBinding {
  id: string;
  category: ModelBenchmarkCategory;
  role: ModelRuntimeRole;
  policy: ModelRuntimePolicy;
  backendModels: readonly string[];
  workflowVersions: readonly string[];
  vault: "primary" | "secondary";
  useNote: string;
}

export interface ModelRuntimeEntry extends ModelRuntimeBinding {
  name: string;
  installState: "installed" | "installing" | "partial" | "queued" | "gated" | "blocked";
  installNote: string;
  workflowConfigured: boolean;
  status: ModelRuntimeStatus;
  adminOnly: true;
  canRunAdminSmoke: boolean;
}

const bindings = [
  {
    id: "flux-schnell",
    category: "image",
    role: "generator",
    policy: "admin_smoke",
    backendModels: ["flux-schnell"],
    workflowVersions: ["image/flux-schnell-v1"],
    vault: "primary",
    useNote: "Generador de imagen base; es el único workflow GPU validado actualmente.",
  },
  {
    id: "sd35-medium",
    category: "image",
    role: "generator",
    policy: "admin_smoke",
    backendModels: ["sd35-medium"],
    workflowVersions: ["image/sd35-medium-v1"],
    vault: "primary",
    useNote: "Generador de imagen con texto; requiere exportar y validar su grafo ComfyUI local.",
  },
  {
    id: "flux2-klein-4b",
    category: "image",
    role: "generator",
    policy: "admin_smoke",
    backendModels: ["flux2-klein-4b"],
    workflowVersions: ["image/flux2-klein-4b-v1"],
    vault: "primary",
    useNote: "Candidato para previews, edición y referencias; falta grafo compatible con los pesos instalados.",
  },
  {
    id: "pixart-sigma",
    category: "image",
    role: "generator",
    policy: "admin_smoke",
    backendModels: ["pixart-sigma"],
    workflowVersions: ["image/pixart-sigma-v1"],
    vault: "primary",
    useNote: "Generador de borradores; falta grafo ComfyUI real para medirlo frente a Schnell.",
  },
  {
    id: "z-image",
    category: "image",
    role: "generator",
    policy: "admin_smoke",
    backendModels: ["z-image"],
    workflowVersions: ["image/z-image-v1"],
    vault: "primary",
    useNote: "Generador eficiente para retratos; fijar release, hashes y workflow antes del smoke.",
  },
  {
    id: "qwen-image",
    category: "image",
    role: "generator",
    policy: "admin_smoke",
    backendModels: ["qwen-image"],
    workflowVersions: ["image/qwen-image-v1"],
    vault: "primary",
    useNote: "Generador pesado orientado a texto y edición; requiere GPU de alta VRAM u optimización validada.",
  },
  {
    id: "flux-dev",
    category: "image",
    role: "generator",
    policy: "admin_research",
    backendModels: ["flux-dev"],
    workflowVersions: ["image/flux-dev-v1"],
    vault: "primary",
    useNote: "Sólo investigación privada por la licencia FLUX Dev; no usar con clientes.",
  },
  {
    id: "flux2-klein-9b",
    category: "image",
    role: "generator",
    policy: "admin_research",
    backendModels: ["flux2-klein-9b"],
    workflowVersions: ["image/flux2-klein-9b-v1"],
    vault: "primary",
    useNote: "Comparativa privada contra Klein 4B; exige revisión de licencia antes de cualquier oferta.",
  },
  {
    id: "juggernaut-xl",
    category: "image",
    role: "generator",
    policy: "admin_research",
    backendModels: ["juggernaut-xl"],
    workflowVersions: ["image/juggernaut-xl-v1"],
    vault: "primary",
    useNote: "Evaluación privada de fotorealismo SDXL; no publicar como modelo comercial aprobado.",
  },
  {
    id: "dynavision-xl",
    category: "image",
    role: "generator",
    policy: "admin_research",
    backendModels: ["dynavision-xl"],
    workflowVersions: ["image/dynavision-xl-v1"],
    vault: "primary",
    useNote: "Checkpoint estilizado para investigación; permisos de hosting externo no están cerrados.",
  },
  {
    id: "wai-ani-ponyxl",
    category: "image",
    role: "generator",
    policy: "admin_research",
    backendModels: ["wai-ani-ponyxl"],
    workflowVersions: ["image/wai-ani-ponyxl-v1"],
    vault: "primary",
    useNote: "Aislado para investigación y moderación; nunca se ofrece públicamente.",
  },
  {
    id: "wan22-ti2v-5b",
    category: "video",
    role: "generator",
    policy: "admin_smoke",
    backendModels: ["wan22-ti2v-5b"],
    workflowVersions: ["video/wan22-ti2v-5b-t2v-v1", "video/wan22-ti2v-5b-i2v-v1"],
    vault: "primary",
    useNote: "Ruta de video T2V/I2V; requiere GPU y workflow específico antes de medir tiempo y coste.",
  },
  {
    id: "hunyuan-video-15-83b",
    category: "video",
    role: "generator",
    policy: "admin_smoke",
    backendModels: ["hunyuan-video-8.3b"],
    workflowVersions: ["video/hunyuan-8.3b-t2v-v1", "video/hunyuan-8.3b-i2v-v1"],
    vault: "secondary",
    useNote: "Video 8.3B con offload; sujeto a licencia comunitaria, disclosure y validación de GPU.",
  },
  {
    id: "hunyuan-video-original",
    category: "video",
    role: "generator",
    policy: "admin_research",
    backendModels: ["hunyuan-video-original"],
    workflowVersions: ["video/hunyuan-original-t2v-v1", "video/hunyuan-original-i2v-v1"],
    vault: "secondary",
    useNote: "Variante pesada para investigación; reservar para GPU de 48–80 GB y no para clientes.",
  },
  {
    id: "liveportrait-no-insightface",
    category: "character",
    role: "generator",
    policy: "admin_smoke",
    backendModels: ["liveportrait"],
    workflowVersions: ["characters/liveportrait-v1"],
    vault: "primary",
    useNote: "Animación de retratos sin InsightFace; falta detector facial alternativo aprobado.",
  },
  {
    id: "f5-tts-official",
    category: "audio",
    role: "generator",
    policy: "admin_research",
    backendModels: ["f5-tts-es"],
    workflowVersions: ["audio/f5-tts-es-v1"],
    vault: "primary",
    useNote: "Sólo investigación no comercial con voces consentidas; los pesos actuales son CC-BY-NC.",
  },
  {
    id: "rvc",
    category: "audio",
    role: "generator",
    policy: "admin_smoke",
    backendModels: ["rvc"],
    workflowVersions: ["audio/rvc-v1"],
    vault: "primary",
    useNote: "Conversión de voz sólo con voz propia o consentimiento y dataset documentado.",
  },
  {
    id: "controlnet-dwpose",
    category: "character",
    role: "component",
    policy: "component_only",
    backendModels: ["controlnet-dwpose"],
    workflowVersions: ["characters/flux-reference-v1"],
    vault: "primary",
    useNote: "Componente de pose para Characters & Worlds; no es un generador independiente.",
  },
  {
    id: "real-esrgan",
    category: "postprocess",
    role: "postprocess",
    policy: "component_only",
    backendModels: ["real-esrgan"],
    workflowVersions: [],
    vault: "primary",
    useNote: "Postproceso de upscale/restauración para outputs de imagen y video.",
  },
  {
    id: "practical-rife",
    category: "postprocess",
    role: "postprocess",
    policy: "component_only",
    backendModels: ["practical-rife"],
    workflowVersions: [],
    vault: "primary",
    useNote: "Postproceso de interpolación de frames; no debe presentarse como generador autónomo.",
  },
  {
    id: "cmu-openpose",
    category: "dependency",
    role: "dependency",
    policy: "replaced",
    backendModels: [],
    workflowVersions: [],
    vault: "primary",
    useNote: "Dependencia histórica reemplazada por DWPose por sus restricciones de investigación.",
  },
  {
    id: "insightface-models",
    category: "dependency",
    role: "dependency",
    policy: "replaced",
    backendModels: [],
    workflowVersions: [],
    vault: "primary",
    useNote: "Pesos aislados para investigación; retirados del flujo comercial de LivePortrait.",
  },
] as const satisfies readonly ModelRuntimeBinding[];

type InstallStateRecord = { state: ModelRuntimeEntry["installState"]; note: string };

const installStates = installState.models as Record<string, InstallStateRecord>;
const benchmarkById = new Map(ADMIN_MODEL_BENCHMARK.map((entry) => [entry.id, entry]));

export const MODEL_RUNTIME_CATALOG = bindings;

export function listModelRuntimeCatalog(): ModelRuntimeEntry[] {
  return bindings.map((binding) => {
    const benchmark = benchmarkById.get(binding.id);
    const installation = installStates[binding.id];
    const workflowConfigured = binding.workflowVersions.some(isWorkflowConfigured);
    const status = resolveRuntimeStatus(binding, workflowConfigured);
    return {
      ...binding,
      name: benchmark?.name ?? binding.id,
      installState: installation?.state ?? "blocked",
      installNote: installation?.note ?? "No hay estado de instalación publicado.",
      workflowConfigured,
      status,
      adminOnly: true,
      canRunAdminSmoke: installation?.state === "installed"
        && workflowConfigured
        && binding.policy === "admin_smoke",
    };
  });
}

export function getModelRuntimeEntry(id: string) {
  return listModelRuntimeCatalog().find((entry) => entry.id === id) ?? null;
}

export function summarizeModelRuntime() {
  const models = listModelRuntimeCatalog();
  return {
    total: models.length,
    installed: models.filter((model) => model.installState === "installed").length,
    workflowReady: models.filter((model) => model.workflowConfigured).length,
    smokeReady: models.filter((model) => model.canRunAdminSmoke).length,
    workflowPending: models.filter((model) => model.status === "workflow_pending").length,
    components: models.filter((model) => model.role === "component" || model.role === "postprocess").length,
    researchOnly: models.filter((model) => model.status === "research_only").length,
    replaced: models.filter((model) => model.status === "replaced").length,
  };
}

function resolveRuntimeStatus(binding: ModelRuntimeBinding, workflowConfigured: boolean): ModelRuntimeStatus {
  if (binding.policy === "replaced") return "replaced";
  if (binding.policy === "admin_research") return "research_only";
  if (binding.role === "component" || binding.role === "postprocess") return "component_pending";
  return workflowConfigured ? "workflow_ready" : "workflow_pending";
}
