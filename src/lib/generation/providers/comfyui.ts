import { ProviderError, type GenerationProvider, type ProviderJob, type ProviderResult, type ProviderStatus, type ProviderSubmitInput } from "./types";

function baseUrl() {
  const value = process.env.VAST_COMFY_BASE_URL?.trim();
  if (!value) throw new ProviderError("Vast.ai ComfyUI no está configurado.", "VAST_NOT_CONFIGURED", false);
  return value.replace(/\/$/, "");
}

async function json<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(process.env.VAST_COMFY_API_KEY ? { authorization: `Bearer ${process.env.VAST_COMFY_API_KEY}` } : {}),
      ...init?.headers,
    },
  });
  if (!response.ok) throw new ProviderError(`ComfyUI respondió ${response.status}.`, `COMFY_HTTP_${response.status}`, response.status >= 500);
  return response.json() as Promise<T>;
}

export class ComfyUIProvider implements GenerationProvider {
  readonly name = "vast" as const;

  async health() {
    try {
      const response = await fetch(`${baseUrl()}/system_stats`, { signal: AbortSignal.timeout(5000) });
      return response.ok;
    } catch {
      return false;
    }
  }

  async queueDepth() {
    try {
      const queue = await json<{ queue_pending?: unknown[]; queue_running?: unknown[] }>(`${baseUrl()}/queue`);
      return (queue.queue_pending?.length ?? 0) + (queue.queue_running?.length ?? 0);
    } catch {
      return Number.POSITIVE_INFINITY;
    }
  }

  async submit(input: ProviderSubmitInput): Promise<ProviderJob> {
    const workflow = parseWorkflow(input.workflowVersion, input.request);
    const payload = await json<{ prompt_id?: string }>(`${baseUrl()}/prompt`, {
      method: "POST",
      body: JSON.stringify({ prompt: workflow, client_id: input.jobId }),
    });
    if (!payload.prompt_id) throw new ProviderError("ComfyUI no devolvió prompt_id.", "COMFY_INVALID_SUBMIT", true);
    return { providerJobId: payload.prompt_id, provider: "vast", kind: input.kind };
  }

  async getStatus(job: ProviderJob): Promise<ProviderStatus> {
    const history = await json<Record<string, { status?: { completed?: boolean; status_str?: string } }>>(`${baseUrl()}/history/${encodeURIComponent(job.providerJobId)}`);
    const entry = history[job.providerJobId];
    if (!entry) return "processing";
    const status = entry.status?.status_str?.toLowerCase();
    if (status === "error" || status === "failed") return "failed";
    return entry.status?.completed ? "completed" : "processing";
  }

  async getResult(job: ProviderJob): Promise<ProviderResult> {
    const history = await json<Record<string, { outputs?: Record<string, { images?: Array<{ filename: string; subfolder?: string; type?: string }>; audio?: Array<{ filename: string; subfolder?: string; type?: string }>; videos?: Array<{ filename: string; subfolder?: string; type?: string }> }> }>>(`${baseUrl()}/history/${encodeURIComponent(job.providerJobId)}`);
    const output = Object.values(history[job.providerJobId]?.outputs ?? {}).flatMap((node) => [...(node.images ?? []), ...(node.audio ?? []), ...(node.videos ?? [])])[0];
    if (!output) throw new ProviderError("ComfyUI no devolvió una imagen de salida.", "COMFY_NO_OUTPUT", true);
    const params = new URLSearchParams({ filename: output.filename, subfolder: output.subfolder ?? "", type: output.type ?? "output" });
    const response = await fetch(`${baseUrl()}/view?${params.toString()}`);
    if (!response.ok) throw new ProviderError("No se pudo descargar el resultado de ComfyUI.", "COMFY_OUTPUT_DOWNLOAD", true);
    return { contentType: response.headers.get("content-type") ?? "image/png", bytes: new Uint8Array(await response.arrayBuffer()), filename: output.filename };
  }

  async cancel(job: ProviderJob) {
    await json(`${baseUrl()}/interrupt`, { method: "POST", body: JSON.stringify({ prompt_id: job.providerJobId }) });
  }
}

function parseWorkflow(workflowVersion: string, request: Record<string, unknown>) {
  const raw = process.env[`WORKFLOW_${workflowVersion.replace(/[^a-zA-Z0-9]/g, "_").toUpperCase()}`];
  if (!raw) throw new ProviderError(`Falta el workflow API de ${workflowVersion}.`, "WORKFLOW_NOT_CONFIGURED", false);
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return injectRequest(parsed, request);
  } catch {
    throw new ProviderError("El workflow configurado no es JSON válido.", "WORKFLOW_INVALID", false);
  }
}

function injectRequest(workflow: Record<string, unknown>, request: Record<string, unknown>) {
  const prompt = typeof request.prompt === "string" ? request.prompt : undefined;
  if (!prompt) return workflow;
  const graph = structuredClone(workflow) as Record<string, unknown>;
  for (const node of Object.values(graph)) {
    if (!node || typeof node !== "object") continue;
    const inputs = (node as { inputs?: Record<string, unknown> }).inputs;
    if (inputs && typeof inputs.text === "string") inputs.text = prompt;
  }
  return graph;
}
