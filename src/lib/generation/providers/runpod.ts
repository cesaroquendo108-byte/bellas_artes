import { ProviderError, type GenerationProvider, type ProviderJob, type ProviderResult, type ProviderStatus, type ProviderSubmitInput } from "./types";

function endpoint(kind?: ProviderSubmitInput["kind"]) {
  const id = kind ? process.env[`RUNPOD_${kind.toUpperCase()}_ENDPOINT_ID`] : undefined;
  const configured = process.env.RUNPOD_ENDPOINT_ID ?? id ?? process.env.RUNPOD_IMAGE_ENDPOINT_ID ?? process.env.RUNPOD_VIDEO_ENDPOINT_ID ?? process.env.RUNPOD_AUDIO_ENDPOINT_ID ?? process.env.RUNPOD_CHARACTER_ENDPOINT_ID ?? process.env.RUNPOD_WORLD_ENDPOINT_ID;
  if (!configured || !process.env.RUNPOD_API_KEY) throw new ProviderError("RunPod no está configurado.", "RUNPOD_NOT_CONFIGURED", false);
  return `https://api.runpod.ai/v2/${configured}`;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { authorization: `Bearer ${process.env.RUNPOD_API_KEY}`, "content-type": "application/json", ...init?.headers },
  });
  if (!response.ok) throw new ProviderError(`RunPod respondió ${response.status}.`, `RUNPOD_HTTP_${response.status}`, response.status >= 500);
  return response.json() as Promise<T>;
}

export class RunPodProvider implements GenerationProvider {
  readonly name = "runpod" as const;

  async health() {
    try {
      await request(`${endpoint()}/health`);
      return true;
    } catch {
      return false;
    }
  }

  async submit(input: ProviderSubmitInput): Promise<ProviderJob> {
    const result = await request<{ id?: string }>(`${endpoint(input.kind)}/run`, { method: "POST", body: JSON.stringify({ input: { ...input.request, workflowVersion: input.workflowVersion, backendModel: input.backendModel, jobId: input.jobId, referenceUrls: input.referenceUrls ?? [] } }) });
    if (!result.id) throw new ProviderError("RunPod no devolvió un id de job.", "RUNPOD_INVALID_SUBMIT", true);
    return { providerJobId: result.id, provider: "runpod", kind: input.kind };
  }

  async getStatus(job: ProviderJob): Promise<ProviderStatus> {
    const result = await request<{ status?: string }>(`${endpoint(job.kind)}/status/${encodeURIComponent(job.providerJobId)}`);
    switch (result.status) {
      case "IN_QUEUE": return "queued";
      case "IN_PROGRESS": return "processing";
      case "COMPLETED": return "completed";
      case "CANCELLED": return "canceled";
      case "FAILED": return "failed";
      default: return "processing";
    }
  }

  async getResult(job: ProviderJob): Promise<ProviderResult> {
    const result = await request<{ output?: { url?: string; contentType?: string; filename?: string } }>(`${endpoint(job.kind)}/status/${encodeURIComponent(job.providerJobId)}`);
    if (!result.output?.url) throw new ProviderError("RunPod no devolvió una URL de salida.", "RUNPOD_NO_OUTPUT", true);
    const response = await fetch(result.output.url);
    if (!response.ok) throw new ProviderError("No se pudo descargar el resultado de RunPod.", "RUNPOD_OUTPUT_DOWNLOAD", true);
    return { contentType: result.output.contentType ?? response.headers.get("content-type") ?? "application/octet-stream", bytes: new Uint8Array(await response.arrayBuffer()), filename: result.output.filename ?? `${job.providerJobId}.bin` };
  }

  async cancel(job: ProviderJob) {
    await request(`${endpoint(job.kind)}/cancel/${encodeURIComponent(job.providerJobId)}`, { method: "POST" });
  }
}
