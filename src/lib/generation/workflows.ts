import fluxSchnellV1 from "../../../workflows/image/flux-schnell-v1.json";

const bundledWorkflows: Record<string, Record<string, unknown>> = {
  "image/flux-schnell-v1": fluxSchnellV1,
};

export function getWorkflowEnvironmentKey(workflowVersion: string) {
  return `WORKFLOW_${workflowVersion.replace(/[^a-zA-Z0-9]/g, "_").toUpperCase()}`;
}

export function isWorkflowConfigured(workflowVersion: string) {
  if (process.env[getWorkflowEnvironmentKey(workflowVersion)]?.trim()) return true;
  return Boolean(bundledWorkflows[workflowVersion]);
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
