import { ADMIN_MODEL_BENCHMARK } from "./model-benchmark";
import { listModelRuntimeCatalog, type ModelRuntimeEntry } from "@/lib/generation/model-runtime-catalog";

export type ModelTestWave =
  | "image-3090"
  | "image-large-vram"
  | "control-and-postprocess"
  | "audio"
  | "video-large-vram"
  | "research-policy"
  | "replaced";

export interface ModelTestWaveDefinition {
  id: ModelTestWave;
  order: number;
  label: string;
  gpu: string;
  minimumVramGb: number | null;
  budgetUsd: number;
  description: string;
}

export interface ModelTestPlanEntry {
  modelId: string;
  name: string;
  wave: ModelTestWave;
  installState: ModelRuntimeEntry["installState"];
  runtimeStatus: ModelRuntimeEntry["status"];
  policy: ModelRuntimeEntry["policy"];
  minimumVramGb: number | null;
  acceptanceJobs: number;
  canRunAdminSmoke: boolean;
  execution: "gpu" | "manual" | "none";
  reason: string;
}

export const MODEL_TEST_WAVE_DEFINITIONS: readonly ModelTestWaveDefinition[] = [
  {
    id: "image-3090",
    order: 1,
    label: "Imagen · RTX 3090",
    gpu: "RTX 3090 / 24 GB",
    minimumVramGb: 24,
    budgetUsd: 5,
    description: "Imagen abierta y postprocesos que caben en una sesión controlada de 24 GB.",
  },
  {
    id: "image-large-vram",
    order: 2,
    label: "Imagen · alta VRAM",
    gpu: "48 GB o cuantización validada",
    minimumVramGb: 48,
    budgetUsd: 5,
    description: "Modelos de imagen que no deben forzarse en la primera sesión 3090.",
  },
  {
    id: "control-and-postprocess",
    order: 3,
    label: "Control, personajes y postproceso",
    gpu: "RTX 3090 / 24 GB",
    minimumVramGb: 8,
    budgetUsd: 5,
    description: "Componentes que sólo se validan dentro de un workflow padre y con assets consentidos.",
  },
  {
    id: "audio",
    order: 4,
    label: "Audio",
    gpu: "GPU aislada / 16 GB recomendado",
    minimumVramGb: 16,
    budgetUsd: 5,
    description: "TTS y conversión de voz con cola separada, consentimiento y política de licencia.",
  },
  {
    id: "video-large-vram",
    order: 5,
    label: "Video",
    gpu: "48–80 GB según modelo",
    minimumVramGb: 48,
    budgetUsd: 5,
    description: "T2V, I2V, V2V, lip-sync, upscale y extensión en sesiones GPU independientes.",
  },
  {
    id: "research-policy",
    order: 6,
    label: "Investigación y licencia",
    gpu: "Sólo laboratorio privado",
    minimumVramGb: null,
    budgetUsd: 5,
    description: "Se pueden estudiar, pero no se ofrecen a clientes sin licencia y controles aprobados.",
  },
  {
    id: "replaced",
    order: 7,
    label: "Reemplazados",
    gpu: "No ejecutar",
    minimumVramGb: null,
    budgetUsd: 0,
    description: "Dependencias históricas retiradas del flujo activo.",
  },
] as const;

const waveById = new Map(MODEL_TEST_WAVE_DEFINITIONS.map((wave) => [wave.id, wave]));
const benchmarkById = new Map<string, (typeof ADMIN_MODEL_BENCHMARK)[number]>(
  ADMIN_MODEL_BENCHMARK.map((model) => [model.id, model]),
);

export function getModelTestWaveDefinition(wave: ModelTestWave) {
  return waveById.get(wave) ?? null;
}

export function listModelTestPlan(): ModelTestPlanEntry[] {
  return listModelRuntimeCatalog().map((model) => {
    const benchmark = benchmarkById.get(model.id);
    const wave = resolveModelTestWave(model);
    return {
      modelId: model.id,
      name: model.name,
      wave,
      installState: model.installState,
      runtimeStatus: model.status,
      policy: model.policy,
      minimumVramGb: benchmark?.minimumVramGb ?? null,
      acceptanceJobs: model.status === "replaced" ? 0 : 5,
      canRunAdminSmoke: model.canRunAdminSmoke,
      execution: model.status === "replaced" ? "none" : model.role === "component" || model.role === "postprocess" ? "manual" : "gpu",
      reason: resolveReason(model),
    } satisfies ModelTestPlanEntry;
  });
}

export function getModelTestPlanEntry(modelId: string) {
  return listModelTestPlan().find((entry) => entry.modelId === modelId) ?? null;
}

export function summarizeModelTestPlan() {
  const plan = listModelTestPlan();
  return {
    total: plan.length,
    installed: plan.filter((entry) => entry.installState === "installed").length,
    executable: plan.filter((entry) => entry.canRunAdminSmoke).length,
    pending: plan.filter((entry) => entry.runtimeStatus === "workflow_pending").length,
    researchOnly: plan.filter((entry) => entry.runtimeStatus === "research_only").length,
    components: plan.filter((entry) => entry.execution === "manual").length,
    replaced: plan.filter((entry) => entry.runtimeStatus === "replaced").length,
    waves: MODEL_TEST_WAVE_DEFINITIONS.map((wave) => ({
      ...wave,
      models: plan.filter((entry) => entry.wave === wave.id).length,
      ready: plan.filter((entry) => entry.wave === wave.id && entry.canRunAdminSmoke).length,
    })),
  };
}

function resolveModelTestWave(model: ModelRuntimeEntry): ModelTestWave {
  if (model.status === "replaced") return "replaced";
  if (model.status === "research_only") return "research-policy";
  if (model.category === "video") return "video-large-vram";
  if (model.category === "audio") return "audio";
  if (model.role === "component" || model.role === "postprocess" || model.category === "character") {
    return "control-and-postprocess";
  }
  if (model.id === "qwen-image") return "image-large-vram";
  return "image-3090";
}

function resolveReason(model: ModelRuntimeEntry) {
  if (model.status === "replaced") return "No ejecutar: la dependencia fue reemplazada.";
  if (model.status === "research_only") return model.useNote;
  if (model.role === "component" || model.role === "postprocess" || model.category === "character") {
    return "Validar dentro de un workflow padre; no presentarlo como generador autónomo.";
  }
  if (!model.workflowConfigured) return "Instalado, pero falta workflow API real y aceptación GPU.";
  return model.useNote;
}
