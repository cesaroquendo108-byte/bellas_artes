import {
  getGenerationConfig,
  getNativeRuntimeApiKey,
  getNativeRuntimeBaseUrl,
  type GenerationProviderKind,
} from "../config";
import {
  ProviderError,
  type GenerationProvider,
  type ProviderJob,
  type ProviderResult,
  type ProviderStatus,
  type ProviderSubmitInput,
} from "./types";

type NativeJobResponse = {
  id?: string;
  job_id?: string;
  status?: string;
  output?: NativeOutput | NativeOutput[];
  result?: NativeOutput | NativeOutput[];
};

type NativeOutput = {
  filename?: string;
  content_type?: string;
  contentType?: string;
  data?: string;
  url?: string;
  metadata?: Record<string, unknown>;
};

export class NativeHttpProvider implements GenerationProvider {
  readonly name = "vast" as const;

  constructor(
    private readonly kind: GenerationProviderKind,
    private readonly backendModel?: string,
  ) {}

  async health() {
    try {
      const response = await this.json<{ status?: string; models?: unknown[] }>("v1/health", {
        signal: AbortSignal.timeout(5_000),
      });
      const status = response.status?.toLowerCase();
      if (status !== "ok" && status !== "ready" && status !== "healthy") return false;
      if (!this.backendModel || !Array.isArray(response.models)) return true;
      return response.models.some((model) => model === this.backendModel
        || (model && typeof model === "object" && (model as { id?: unknown }).id === this.backendModel));
    } catch {
      return false;
    }
  }

  async queueDepth() {
    try {
      const response = await this.json<{ depth?: unknown }>("v1/queue");
      const depth = Number(response.depth);
      return Number.isFinite(depth) && depth >= 0 ? depth : Number.POSITIVE_INFINITY;
    } catch {
      return Number.POSITIVE_INFINITY;
    }
  }

  async submit(input: ProviderSubmitInput): Promise<ProviderJob> {
    const response = await this.json<NativeJobResponse>("v1/jobs", {
      method: "POST",
      headers: { "x-idempotency-key": input.jobId },
      body: JSON.stringify({
        request_id: input.jobId,
        kind: input.kind,
        model: input.backendModel,
        operation: input.workflowVersion,
        input: input.request,
        source_urls: input.sourceUrls ?? [],
        reference_urls: input.referenceUrls ?? [],
      }),
    });
    const providerJobId = response.id ?? response.job_id;
    if (!providerJobId) {
      throw new ProviderError("El runtime nativo no devolvió un id de job.", "NATIVE_INVALID_SUBMIT", true);
    }
    return { providerJobId, provider: "vast", kind: input.kind };
  }

  async getStatus(job: ProviderJob): Promise<ProviderStatus> {
    const response = await this.getJob(job);
    return normalizeStatus(response.status);
  }

  async getResult(job: ProviderJob): Promise<ProviderResult> {
    const response = await this.getJob(job);
    if (normalizeStatus(response.status) !== "completed") {
      throw new ProviderError("El runtime nativo todavía no completó el job.", "NATIVE_RESULT_NOT_READY", true);
    }
    const candidate = firstOutput(response.output ?? response.result);
    if (!candidate) {
      throw new ProviderError("El runtime nativo no devolvió una salida.", "NATIVE_OUTPUT_MISSING", true);
    }
    const filename = safeFilename(candidate.filename, `${job.kind}-${job.providerJobId}`);
    const resolved = candidate.data
      ? decodeBase64(candidate.data, candidate.content_type ?? candidate.contentType, filename)
      : candidate.url
        ? await downloadOutput(candidate.url, candidate.content_type ?? candidate.contentType, filename)
        : null;
    if (!resolved) throw new ProviderError("La salida nativa no es descargable.", "NATIVE_OUTPUT_MISSING", true);
    return {
      ...resolved,
      filename,
      metadata: stringMetadata(candidate.metadata),
    };
  }

  async cancel(job: ProviderJob) {
    await this.json(`v1/jobs/${encodeURIComponent(job.providerJobId)}`, { method: "DELETE" });
  }

  private async getJob(job: ProviderJob) {
    return this.json<NativeJobResponse>(`v1/jobs/${encodeURIComponent(job.providerJobId)}`);
  }

  private async json<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await nativeFetch(this.kind, path, init);
    const retryable = response.status === 408 || response.status === 425 || response.status === 429 || response.status >= 500;
    if (!response.ok) {
      throw new ProviderError(`El runtime nativo respondió ${response.status}.`, `NATIVE_HTTP_${response.status}`, retryable);
    }
    return response.json() as Promise<T>;
  }
}

async function nativeFetch(kind: GenerationProviderKind, path: string, init?: RequestInit) {
  const base = getNativeRuntimeBaseUrl(kind);
  const apiKey = getNativeRuntimeApiKey();
  if (!base || !apiKey) {
    throw new ProviderError("El runtime nativo no está configurado.", "NATIVE_NOT_CONFIGURED", false);
  }
  const baseUrl = new URL(ensureTrailingSlash(base));
  if (baseUrl.protocol !== "https:" && !isLocalDevelopmentUrl(baseUrl)) {
    throw new ProviderError("El runtime nativo debe usar HTTPS.", "NATIVE_URL_REJECTED", false);
  }
  return fetch(new URL(path, baseUrl), {
    ...init,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
      ...init?.headers,
    },
    signal: init?.signal ?? AbortSignal.timeout(getGenerationConfig().requestTimeoutMs),
  });
}

function normalizeStatus(value?: string): ProviderStatus {
  const status = value?.toLowerCase();
  if (status === "completed" || status === "succeeded" || status === "success") return "completed";
  if (status === "failed" || status === "error") return "failed";
  if (status === "canceled" || status === "cancelled") return "canceled";
  if (status === "queued" || status === "pending") return "queued";
  return "processing";
}

function firstOutput(value: NativeOutput | NativeOutput[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function decodeBase64(value: string, contentType: string | undefined, filename: string) {
  const match = /^data:([^;,]+);base64,([\s\S]+)$/.exec(value);
  const encoded = (match?.[2] ?? value).replace(/\s/g, "");
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(encoded)) {
    throw new ProviderError("La salida base64 nativa no es válida.", "NATIVE_OUTPUT_INVALID", false);
  }
  const bytes = new Uint8Array(Buffer.from(encoded, "base64"));
  if (!bytes.byteLength || bytes.byteLength > 500 * 1024 * 1024) {
    throw new ProviderError("La salida nativa excede el límite permitido.", "NATIVE_OUTPUT_INVALID", false);
  }
  return { contentType: match?.[1] || contentType || inferContentType(filename), bytes };
}

async function downloadOutput(urlValue: string, contentType: string | undefined, filename: string) {
  const url = new URL(urlValue);
  if (url.protocol !== "https:") {
    throw new ProviderError("La salida nativa no usa HTTPS.", "NATIVE_OUTPUT_URL_REJECTED", false);
  }
  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID?.trim();
  const allowed = new Set([
    ...(accountId ? [`${accountId}.r2.cloudflarestorage.com`] : []),
    ...(`${process.env.NATIVE_RUNTIME_OUTPUT_ALLOWED_HOSTS ?? ""},${process.env.VAST_OUTPUT_ALLOWED_HOSTS ?? ""}`)
      .split(",")
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean),
  ]);
  if (!allowed.has(url.hostname.toLowerCase())) {
    throw new ProviderError("El host de salida nativo no está permitido.", "NATIVE_OUTPUT_URL_REJECTED", false);
  }
  const response = await fetch(url, { signal: AbortSignal.timeout(getGenerationConfig().requestTimeoutMs) });
  if (!response.ok) throw new ProviderError("No se pudo descargar la salida nativa.", "NATIVE_OUTPUT_DOWNLOAD", true);
  return {
    contentType: response.headers.get("content-type") || contentType || inferContentType(filename),
    bytes: new Uint8Array(await response.arrayBuffer()),
  };
}

function stringMetadata(input?: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(input ?? {}).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
}

function safeFilename(value: string | undefined, fallback: string) {
  const filename = value?.split(/[\\/]/).pop()?.replace(/[^a-zA-Z0-9._-]/g, "_");
  return filename || fallback;
}

function inferContentType(filename: string) {
  const extension = filename.split(".").pop()?.toLowerCase();
  if (extension === "png") return "image/png";
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "webp") return "image/webp";
  if (extension === "mp4") return "video/mp4";
  if (extension === "wav") return "audio/wav";
  if (extension === "mp3") return "audio/mpeg";
  return "application/octet-stream";
}

function ensureTrailingSlash(value: string) {
  return value.endsWith("/") ? value : `${value}/`;
}

function isLocalDevelopmentUrl(url: URL) {
  return process.env.NODE_ENV !== "production" && ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
}
