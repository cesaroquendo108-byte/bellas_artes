export type ProviderStatus = "queued" | "processing" | "completed" | "failed" | "canceled";

export interface ProviderSubmitInput {
  jobId: string;
  kind: "image" | "video" | "audio" | "character" | "world";
  workflowVersion: string;
  backendModel: string;
  request: Record<string, unknown>;
  sourceUrls?: string[];
  referenceUrls?: string[];
}

export interface ProviderJob {
  providerJobId: string;
  provider: "vast" | "fake";
  kind: ProviderSubmitInput["kind"];
}

export interface ProviderResult {
  contentType: string;
  bytes: Uint8Array;
  filename: string;
  metadata?: Record<string, string>;
}

export interface ProviderExecution {
  job: ProviderJob;
  result: ProviderResult;
  timings?: Record<string, number>;
}

export interface GenerationProvider {
  readonly name: ProviderJob["provider"];
  health(): Promise<boolean>;
  submit(input: ProviderSubmitInput): Promise<ProviderJob>;
  getStatus(job: ProviderJob): Promise<ProviderStatus>;
  getResult(job: ProviderJob): Promise<ProviderResult>;
  cancel(job: ProviderJob): Promise<void>;
  execute?(input: ProviderSubmitInput, options?: {
    signal?: AbortSignal;
    onAssigned?: (job: ProviderJob) => Promise<void>;
  }): Promise<ProviderExecution>;
}

export class ProviderError extends Error {
  constructor(
    message: string,
    readonly code = "PROVIDER_ERROR",
    readonly retryable = true,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}
