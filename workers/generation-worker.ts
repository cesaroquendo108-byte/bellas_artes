import "server-only";

import { Worker, type Job } from "bullmq";
import Redis from "ioredis";
import { getGenerationConfig } from "@/lib/generation/config";
import { completeGenerationJob, getGenerationJob, markGenerationProcessing, recordGenerationFailure, refundGenerationJob, verifyOwnedAssets } from "@/lib/generation/db";
import { persistGenerationOutput } from "@/lib/generation/output";
import { selectProvider, ProviderError } from "@/lib/generation/providers";
import { getPrivateObjectUrl } from "@/lib/storage/r2";

type WorkerPayload = { jobId: string };

async function processGenerationJob(job: Job<WorkerPayload>) {
  const record = await getGenerationJob(job.data.jobId);
  if (!record) throw new Error("GENERATION_JOB_NOT_FOUND");
  if (["completed", "failed", "canceled"].includes(record.status)) return;
  if (record.cancel_requested) {
    await refundGenerationJob({ jobId: record.id, code: "CANCELED", message: "El job fue cancelado.", canceled: true });
    return;
  }

  const sourceIds = Array.isArray(record.request.sourceAssetIds) ? record.request.sourceAssetIds.filter((value): value is string => typeof value === "string") : [];
  const referenceIds = Array.isArray(record.request.referenceAssetIds) ? record.request.referenceAssetIds.filter((value): value is string => typeof value === "string") : [];
  const assets = await verifyOwnedAssets(record.user_id, [...sourceIds, ...referenceIds]);
  const referenceUrls = await Promise.all(assets.map((asset) => getPrivateObjectUrl(asset.r2_key)));
  const provider = await selectProvider({ preferred: record.provider_route as "vast" | "runpod", kind: record.kind });
  const providerJob = await provider.submit({
    jobId: record.id,
    kind: record.kind,
    workflowVersion: record.workflow_version,
    backendModel: record.backend_model,
    request: record.request,
    referenceUrls,
  });
  await markGenerationProcessing({ jobId: record.id, providerJobId: providerJob.providerJobId, providerRoute: provider.name, attempt: job.attemptsMade + 1 });

  let status = await provider.getStatus(providerJob);
  for (let i = 0; i < 120 && (status === "queued" || status === "processing"); i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    const latest = await getGenerationJob(record.id);
    if (latest?.cancel_requested) {
      await provider.cancel(providerJob).catch(() => undefined);
      await refundGenerationJob({ jobId: record.id, code: "CANCELED", message: "El job fue cancelado.", canceled: true });
      return;
    }
    status = await provider.getStatus(providerJob);
  }
  if (status === "canceled") {
    await refundGenerationJob({ jobId: record.id, code: "PROVIDER_CANCELED", message: "El proveedor canceló el job.", canceled: true });
    return;
  }
  if (status !== "completed") throw new Error(status === "failed" ? "PROVIDER_FAILED" : "PROVIDER_TIMEOUT");
  const result = await provider.getResult(providerJob);
  const assetId = await persistGenerationOutput({ userId: record.user_id, jobId: record.id, kind: record.kind, result });
  await completeGenerationJob(record.id, [assetId]);
}

export function startGenerationWorkers() {
  const redisUrl = process.env.REDIS_URL?.trim();
  if (!redisUrl) throw new Error("REDIS_URL no está configurado.");
  const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
  const config = getGenerationConfig();
  return ["image", "video", "audio", "character", "world"].map((kind) => new Worker<WorkerPayload>(`generation:${kind}`, async (job) => {
    try {
      await processGenerationJob(job);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error de worker.";
      const retryable = error instanceof ProviderError ? error.retryable : job.attemptsMade + 1 < job.opts.attempts!;
      await recordGenerationFailure({ jobId: job.data.jobId, code: message, message, retryable }).catch(() => undefined);
      if (!retryable) {
        await refundGenerationJob({ jobId: job.data.jobId, code: message, message }).catch(() => undefined);
        return;
      }
      throw error;
    }
  }, { connection, prefix: process.env.BULLMQ_PREFIX ?? "bellas-artes", concurrency: config.workerConcurrency }));
}

if (process.env.RUN_GENERATION_WORKER === "true") startGenerationWorkers();
