import fluxSchnellV1 from "../../../workflows/image/flux-schnell-v1.json";
import wan22Ti2v5bI2vV1 from "../../../workflows/video/wan22-ti2v-5b-i2v-v1.json";
import wan22Ti2v5bActionSyncV1 from "../../../workflows/video/wan22-ti2v-5b-action-sync-v1.json";
import kokoro82mV1 from "../../../workflows/audio/kokoro-82m-v1.json";
import ltx23I2vV1 from "../../../workflows/video/ltx-2.3-i2v-v1.json";
import { hasWorkflowManifest, validateWorkflowGraph } from "./workflow-manifests";

const bundledWorkflows: Record<string, Record<string, unknown>> = {
  "image/flux-schnell-v1": fluxSchnellV1,
  "video/wan22-ti2v-5b-i2v-v1": wan22Ti2v5bI2vV1,
  "video/wan22-ti2v-5b-action-sync-v1": wan22Ti2v5bActionSyncV1,
  "audio/kokoro-82m-v1": kokoro82mV1,
  "video/ltx-2.3-i2v-v1": ltx23I2vV1,
};

export function getWorkflowEnvironmentKey(workflowVersion: string) {
  return `WORKFLOW_${workflowVersion.replace(/[^a-zA-Z0-9]/g, "_").toUpperCase()}`;
}

export function isWorkflowConfigured(workflowVersion: string) {
  if (!hasWorkflowManifest(workflowVersion)) return false;
  try {
    return validateWorkflowGraph(workflowVersion, loadWorkflow(workflowVersion));
  } catch {
    return false;
  }
}

export function loadWorkflow(workflowVersion: string) {
  const environmentValue = process.env[getWorkflowEnvironmentKey(workflowVersion)]?.trim();
  if (environmentValue) return parseWorkflowJson(environmentValue, workflowVersion);
  const bundled = bundledWorkflows[workflowVersion];
  if (!bundled) throw new Error(`Falta el workflow API de ${workflowVersion}.`);
  return structuredClone(bundled);
}

function parseWorkflowJson(raw: string, workflowVersion: string) {
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`El workflow ${workflowVersion} no es un grafo JSON válido.`);
  }
  return parsed as Record<string, unknown>;
}
