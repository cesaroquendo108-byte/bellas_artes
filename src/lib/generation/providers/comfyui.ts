import { ProviderError, type GenerationProvider, type ProviderJob, type ProviderResult, type ProviderStatus, type ProviderSubmitInput } from "./types";
import { getGenerationConfig, getVastComfyBaseUrl, getVastServerlessEndpointName, type GenerationProviderKind } from "../config";
import { loadWorkflow } from "../workflows";
import { bindWorkflow, loadWorkflowManifest } from "../workflow-manifests";

function baseUrl(kind?: GenerationProviderKind) {
  const value = getVastComfyBaseUrl(kind);
  if (!value) throw new ProviderError("Vast.ai ComfyUI no está configurado.", "VAST_NOT_CONFIGURED", false);
  return value.replace(/\/$/, "");
}

function requestHeaders(init?: RequestInit) {
  return {
    "content-type": "application/json",
    ...(process.env.VAST_COMFY_API_KEY ? { authorization: `Bearer ${process.env.VAST_COMFY_API_KEY}` } : {}),
    ...init?.headers,
  };
}

async function providerFetch(url: string, init?: RequestInit) {
  return fetch(url, {
    ...init,
    headers: requestHeaders(init),
    signal: init?.signal ?? AbortSignal.timeout(getGenerationConfig().requestTimeoutMs),
  });
}

async function json<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await providerFetch(url, init);
  const retryable = response.status === 408 || response.status === 425 || response.status === 429 || response.status >= 500;
  if (!response.ok) throw new ProviderError(`ComfyUI respondió ${response.status}.`, `COMFY_HTTP_${response.status}`, retryable);
  return response.json() as Promise<T>;
}

export class ComfyUIProvider implements GenerationProvider {
  readonly name = "vast" as const;

  constructor(private readonly kind?: GenerationProviderKind) {}

  async health() {
    const endpointName = getVastServerlessEndpointName(this.kind);
    if (endpointName) return this.serverlessHealth(endpointName);
    try {
      const response = await providerFetch(`${baseUrl(this.kind)}/system_stats`, { signal: AbortSignal.timeout(5000) });
      return response.ok;
    } catch {
      return false;
    }
  }

  async queueDepth() {
    if (getVastServerlessEndpointName(this.kind)) return 0;
    try {
      const queue = await json<{ queue_pending?: unknown[]; queue_running?: unknown[] }>(`${baseUrl(this.kind)}/queue`);
      return (queue.queue_pending?.length ?? 0) + (queue.queue_running?.length ?? 0);
    } catch {
      return Number.POSITIVE_INFINITY;
    }
  }

  async submit(input: ProviderSubmitInput): Promise<ProviderJob> {
    const existingProviderJobId = await this.findExistingJob(input.jobId, input.kind);
    if (existingProviderJobId) {
      return { providerJobId: existingProviderJobId, provider: "vast", kind: input.kind };
    }
    const workflow = parseWorkflow(input.workflowVersion, input.request, input.referenceUrls ?? []);
    const payload = await json<{ prompt_id?: string }>(`${baseUrl(input.kind)}/prompt`, {
      method: "POST",
      body: JSON.stringify({ prompt: workflow, client_id: input.jobId }),
    });
    if (!payload.prompt_id) throw new ProviderError("ComfyUI no devolvió prompt_id.", "COMFY_INVALID_SUBMIT", true);
    return { providerJobId: payload.prompt_id, provider: "vast", kind: input.kind };
  }

  async getStatus(job: ProviderJob): Promise<ProviderStatus> {
    const history = await json<Record<string, { status?: { completed?: boolean; status_str?: string } }>>(`${baseUrl(job.kind)}/history/${encodeURIComponent(job.providerJobId)}`);
    const entry = history[job.providerJobId];
    if (!entry) return "processing";
    const status = entry.status?.status_str?.toLowerCase();
    if (status === "error" || status === "failed") return "failed";
    return entry.status?.completed ? "completed" : "processing";
  }

  async getResult(job: ProviderJob): Promise<ProviderResult> {
    const history = await json<Record<string, { outputs?: Record<string, { images?: Array<{ filename: string; subfolder?: string; type?: string }>; audio?: Array<{ filename: string; subfolder?: string; type?: string }>; videos?: Array<{ filename: string; subfolder?: string; type?: string }> }> }>>(`${baseUrl(job.kind)}/history/${encodeURIComponent(job.providerJobId)}`);
    const output = Object.values(history[job.providerJobId]?.outputs ?? {}).flatMap((node) => [...(node.images ?? []), ...(node.audio ?? []), ...(node.videos ?? [])])[0];
    if (!output) throw new ProviderError("ComfyUI no devolvió una imagen de salida.", "COMFY_NO_OUTPUT", true);
    const params = new URLSearchParams({ filename: output.filename, subfolder: output.subfolder ?? "", type: output.type ?? "output" });
    const response = await providerFetch(`${baseUrl(job.kind)}/view?${params.toString()}`);
    if (!response.ok) throw new ProviderError("No se pudo descargar el resultado de ComfyUI.", "COMFY_OUTPUT_DOWNLOAD", true);
    return { contentType: response.headers.get("content-type") ?? "image/png", bytes: new Uint8Array(await response.arrayBuffer()), filename: output.filename };
  }

  async cancel(job: ProviderJob) {
    await json(`${baseUrl(job.kind)}/interrupt`, { method: "POST", body: JSON.stringify({ prompt_id: job.providerJobId }) });
  }

  async execute(input: ProviderSubmitInput, options?: {
    signal?: AbortSignal;
    onAssigned?: (job: ProviderJob) => Promise<void>;
  }) {
    const endpointName = getVastServerlessEndpointName(input.kind, input.workflowVersion);
    if (!endpointName) throw new ProviderError("Vast Serverless no está configurado para esta modalidad.", "VAST_ENDPOINT_NOT_CONFIGURED", false);
    const workflow = parseWorkflow(input.workflowVersion, input.request, input.referenceUrls ?? []);
    const assignment = await waitForServerlessAssignment(endpointName, input, options?.signal);
    const job: ProviderJob = { providerJobId: input.jobId, provider: "vast", kind: input.kind };
    await options?.onAssigned?.(job);

    const config = getGenerationConfig();
    const response = await fetch(new URL("generate/sync", ensureTrailingSlash(assignment.url)), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        auth_data: {
          ...assignment,
          request_idx: Math.floor(Math.random() * 2_147_483_647),
        },
        payload: {
          input: {
            request_id: input.jobId,
            workflow_json: workflow,
          },
        },
      }),
      signal: combineSignals(options?.signal, AbortSignal.timeout(config.jobTimeoutSeconds * 1000)),
    });
    if (!response.ok) {
      const retryable = response.status === 408 || response.status === 425 || response.status === 429 || response.status >= 500;
      throw new ProviderError(`Vast PyWorker respondió ${response.status}.`, `VAST_WORKER_HTTP_${response.status}`, retryable);
    }

    const raw = await response.json() as { response?: VastComfyResponse } & VastComfyResponse;
    const payload = raw.response ?? raw;
    if (payload.status !== "completed") {
      throw new ProviderError(payload.message ?? "Vast no completó el workflow.", "VAST_GENERATION_FAILED", false);
    }
    const output = payload.output?.find((candidate) => typeof candidate.url === "string" && candidate.url.length > 0);
    if (!output?.url) throw new ProviderError("Vast no devolvió una URL de salida.", "VAST_OUTPUT_URL_MISSING", true);
    assertAllowedOutputUrl(output.url);
    const outputResponse = await fetch(output.url, {
      signal: combineSignals(options?.signal, AbortSignal.timeout(config.requestTimeoutMs)),
    });
    if (!outputResponse.ok) throw new ProviderError("No se pudo descargar la salida de Vast.", "VAST_OUTPUT_DOWNLOAD", true);
    const contentType = outputResponse.headers.get("content-type") ?? inferContentType(output.filename);

    return {
      job,
      result: {
        contentType,
        bytes: new Uint8Array(await outputResponse.arrayBuffer()),
        filename: output.filename || `${input.kind}-${input.jobId}`,
      },
      timings: numericTimings(payload.timings),
    };
  }

  private async serverlessHealth(endpointName: string) {
    const apiKey = process.env.VAST_API_KEY?.trim();
    if (!apiKey) return false;
    try {
      const response = await fetch("https://console.vast.ai/api/v0/endptjobs/", {
        headers: { authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(getGenerationConfig().requestTimeoutMs),
      });
      if (!response.ok) return false;
      const body = await response.json() as { results?: Array<Record<string, unknown>> };
      const endpoint = body.results?.find((candidate) => candidate.endpoint_name === endpointName);
      const config = getGenerationConfig();
      return endpoint?.endpoint_state === "active"
        && Number(endpoint.min_load) === 0
        && Number(endpoint.cold_workers) === 0
        && Number(endpoint.max_workers) === 1
        && Number(endpoint.inactivity_timeout) === config.vastServerless.inactivityTimeoutSeconds;
    } catch {
      return false;
    }
  }

  private async findExistingJob(clientId: string, kind: GenerationProviderKind) {
    try {
      const queue = await json<{ queue_pending?: unknown[]; queue_running?: unknown[] }>(`${baseUrl(kind)}/queue`);
      for (const entry of [...(queue.queue_running ?? []), ...(queue.queue_pending ?? [])]) {
        const match = getQueuedPromptIdentity(entry);
        if (match.clientId === clientId && match.providerJobId) return match.providerJobId;
      }

      const history = await json<Record<string, { prompt?: unknown }>>(`${baseUrl(kind)}/history?max_items=100`);
      for (const [providerJobId, entry] of Object.entries(history)) {
        if (getPromptClientId(entry.prompt) === clientId) return providerJobId;
      }
    } catch (error) {
      if (error instanceof ProviderError) throw error;
      throw new ProviderError("No se pudo verificar la idempotencia en ComfyUI.", "COMFY_IDEMPOTENCY_CHECK", true);
    }
  }
}

interface VastRouteAssignment {
  endpoint: string;
  url: string;
  cost: number;
  reqnum: number;
  signature: string;
  __request_id?: string;
}

interface VastComfyResponse {
  id?: string;
  status?: string;
  message?: string;
  output?: Array<{ filename?: string; url?: string; output_type?: string }>;
  timings?: Record<string, unknown>;
}

async function waitForServerlessAssignment(
  endpoint: string,
  input: ProviderSubmitInput,
  signal?: AbortSignal,
): Promise<VastRouteAssignment> {
  const apiKey = process.env.VAST_API_KEY?.trim();
  if (!apiKey) throw new ProviderError("VAST_API_KEY no está configurada.", "VAST_API_KEY_MISSING", false);
  const config = getGenerationConfig();
  const deadline = Date.now() + config.jobTimeoutSeconds * 1000;
  const routeUrl = process.env.VAST_SERVERLESS_ROUTE_URL?.trim() || "https://run.vast.ai/route/";
  const configuredCost = Number(process.env[`VAST_${input.kind.toUpperCase()}_REQUEST_COST`] ?? process.env.VAST_SERVERLESS_REQUEST_COST ?? 100);
  const cost = Number.isFinite(configuredCost) && configuredCost >= 0 ? configuredCost : 100;
  let delayMs = 1_000;

  while (Date.now() < deadline) {
    if (signal?.aborted) throw new ProviderError("El job fue cancelado antes de obtener GPU.", "CANCELED", false);
    const response = await fetch(routeUrl, {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ endpoint, cost }),
      signal: combineSignals(signal, AbortSignal.timeout(config.requestTimeoutMs)),
    });
    if (response.status === 429 || response.status >= 500) {
      await abortableDelay(delayMs, signal);
      delayMs = Math.min(delayMs * 2, 10_000);
      continue;
    }
    if (!response.ok) throw new ProviderError(`Vast router respondió ${response.status}.`, `VAST_ROUTE_HTTP_${response.status}`, false);
    const assignment = await response.json() as Partial<VastRouteAssignment> & { error?: string };
    if (assignment.url && assignment.signature && assignment.reqnum !== undefined) {
      return assignment as VastRouteAssignment;
    }
    if (assignment.error) throw new ProviderError(assignment.error, "VAST_ROUTE_REJECTED", false);
    await abortableDelay(delayMs, signal);
    delayMs = Math.min(delayMs * 2, 10_000);
  }
  throw new ProviderError("Vast no asignó una GPU antes del timeout.", "VAST_ROUTE_TIMEOUT", true);
}

function abortableDelay(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(timeout);
      reject(new ProviderError("El job fue cancelado.", "CANCELED", false));
    }, { once: true });
  });
}

function combineSignals(first: AbortSignal | undefined, second: AbortSignal) {
  return first ? AbortSignal.any([first, second]) : second;
}

function ensureTrailingSlash(value: string) {
  return value.endsWith("/") ? value : `${value}/`;
}

function assertAllowedOutputUrl(value: string) {
  const url = new URL(value);
  if (url.protocol !== "https:") throw new ProviderError("La salida de Vast no usa HTTPS.", "VAST_OUTPUT_URL_REJECTED", false);
  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID?.trim();
  const configured = (process.env.VAST_OUTPUT_ALLOWED_HOSTS ?? "")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
  const allowed = new Set([
    ...(accountId ? [`${accountId}.r2.cloudflarestorage.com`] : []),
    ...configured,
  ]);
  if (!allowed.has(url.hostname.toLowerCase())) {
    throw new ProviderError("El host de salida de Vast no está permitido.", "VAST_OUTPUT_URL_REJECTED", false);
  }
}

function inferContentType(filename?: string) {
  const extension = filename?.split(".").pop()?.toLowerCase();
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "webp") return "image/webp";
  if (extension === "mp4") return "video/mp4";
  if (extension === "wav") return "audio/wav";
  if (extension === "mp3") return "audio/mpeg";
  return "application/octet-stream";
}

function numericTimings(input?: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(input ?? {}).filter((entry): entry is [string, number] => typeof entry[1] === "number"));
}

function getQueuedPromptIdentity(entry: unknown) {
  if (!Array.isArray(entry)) return { clientId: null, providerJobId: null };
  const providerJobId = typeof entry[1] === "string" ? entry[1] : null;
  return { clientId: getPromptClientId(entry), providerJobId };
}

function getPromptClientId(prompt: unknown) {
  if (!Array.isArray(prompt)) return null;
  const extraData = prompt[3];
  if (!extraData || typeof extraData !== "object") return null;
  const clientId = (extraData as { client_id?: unknown }).client_id;
  return typeof clientId === "string" ? clientId : null;
}

function parseWorkflow(workflowVersion: string, request: Record<string, unknown>, referenceUrls: string[]) {
  try {
    return bindWorkflow({
      workflow: loadWorkflow(workflowVersion),
      manifest: loadWorkflowManifest(workflowVersion),
      request,
      referenceUrls,
    });
  } catch {
    throw new ProviderError(`El workflow ${workflowVersion} no está configurado o no es válido.`, "WORKFLOW_INVALID", false);
  }
}
