import { UnrecoverableError, Worker, type Job } from "bullmq";
import Redis from "ioredis";
import { assertSafeVastServerlessConfig, getEstimatedVastCostRate, getGenerationConfig, getVastServerlessEndpointName } from "@/lib/generation/config";
import { completeGenerationJob, getGenerationJob, markGenerationProcessing, recordGenerationActualCost, recordGenerationFailure, recordGenerationMetrics, refundGenerationJob, verifyOwnedAssets } from "@/lib/generation/db";
import { persistGenerationOutput } from "@/lib/generation/output";
import { getProvider, selectProvider, ProviderError, type ProviderJob, type ProviderResult } from "@/lib/generation/providers";
import { getPrivateObjectUrl } from "@/lib/storage/r2";
import { moveToDLQ, type GenerationQueueKind } from "@/lib/generation/queue";
import { claimVastTestBudget, finalizeVastTestBudget } from "@/lib/generation/vast-test-budget";
import { loadWorkflowManifest, validateWorkflowAssets } from "@/lib/generation/workflow-manifests";

type WorkerPayload = { jobId: string };
const activeConnections = new Set<Redis>();
const activeWorkers = new Set<Worker<WorkerPayload>>();
let shutdownHandlersInstalled = false;

function log(level: "info" | "warn" | "error", message: string, meta?: Record<string, unknown>) {
  const entry = { ts: new Date().toISOString(), level, message, ...meta };
  if (level === "error") console.error(JSON.stringify(entry));
  else console.log(JSON.stringify(entry));
}

async function processGenerationJob(job: Job<WorkerPayload>) {
  const attemptStartedAt = Date.now();
  const record = await getGenerationJob(job.data.jobId);
  if (!record) throw new Error("GENERATION_JOB_NOT_FOUND");
  if (["completed", "failed", "canceled"].includes(record.status)) return;
  if (record.cancel_requested) {
    await refundGenerationJob({ jobId: record.id, code: "CANCELED", message: "El job fue cancelado.", canceled: true });
    return;
  }

  const sourceIds = Array.isArray(record.request.sourceAssetIds) ? record.request.sourceAssetIds.filter((value): value is string => typeof value === "string") : [];
  const referenceIds = Array.isArray(record.request.referenceAssetIds) ? record.request.referenceAssetIds.filter((value): value is string => typeof value === "string") : [];
  const requestedAssetIds = [...sourceIds, ...referenceIds];
  const assets = await verifyOwnedAssets(record.user_id, requestedAssetIds);
  const assetsById = new Map(assets.map((asset) => [asset.id, asset]));
  const orderedSourceAssets = sourceIds.map((id) => assetsById.get(id)).filter((asset): asset is NonNullable<typeof asset> => Boolean(asset));
  const orderedReferenceAssets = referenceIds.map((id) => assetsById.get(id)).filter((asset): asset is NonNullable<typeof asset> => Boolean(asset));
  const workflowManifest = loadWorkflowManifest(record.workflow_version);
  try {
    validateWorkflowAssets(workflowManifest, { source: orderedSourceAssets, reference: orderedReferenceAssets });
  } catch (error) {
    throw new ProviderError(error instanceof Error ? error.message : "Los assets no cumplen el contrato del workflow.", "WORKFLOW_ASSET_INVALID", false);
  }
  const sourceUrls = await Promise.all(orderedSourceAssets.map((asset) => getPrivateObjectUrl(asset.r2_key)));
  const referenceUrls = await Promise.all(orderedReferenceAssets.map((asset) => getPrivateObjectUrl(asset.r2_key)));
  const submitInput = {
    jobId: record.id,
    kind: record.kind,
    workflowVersion: record.workflow_version,
    backendModel: record.backend_model,
    request: record.request,
    sourceUrls,
    referenceUrls,
  };
  const usesServerlessRouter = Boolean(getVastServerlessEndpointName(record.kind, record.workflow_version));
  const resumingExistingProviderJob = record.provider_route === "vast" && Boolean(record.provider_job_id);
  const provider = resumingExistingProviderJob && !usesServerlessRouter
    ? getProvider("vast", record.kind)
    : await selectProvider({ kind: record.kind });
  let result: ProviderResult;
  let submittedAt: number;

  if (usesServerlessRouter && provider.execute) {
    const cancellationController = new AbortController();
    const cancellationWatcher = setInterval(async () => {
      const latest = await getGenerationJob(record.id).catch(() => null);
      if (latest?.cancel_requested) cancellationController.abort();
    }, 5_000);
    cancellationWatcher.unref();
    try {
      submittedAt = Date.now();
      const execution = await provider.execute(submitInput, {
        signal: cancellationController.signal,
        onAssigned: async (assignedJob) => {
          submittedAt = Date.now();
          await markGenerationProcessing({
            jobId: record.id,
            providerJobId: assignedJob.providerJobId,
            providerRoute: provider.name,
            attempt: job.attemptsMade + 1,
          });
        },
      });
      result = execution.result;
    } catch (error) {
      if (error instanceof ProviderError && error.code === "CANCELED") {
        await refundGenerationJob({ jobId: record.id, code: "CANCELED", message: "El job fue cancelado.", canceled: true });
        return;
      }
      throw error;
    } finally {
      clearInterval(cancellationWatcher);
    }
  } else {
    const providerJob: ProviderJob = resumingExistingProviderJob
      ? { providerJobId: record.provider_job_id!, provider: "vast", kind: record.kind }
      : await provider.submit(submitInput);
    submittedAt = resumingExistingProviderJob && record.started_at
      ? Date.parse(record.started_at)
      : Date.now();
    await markGenerationProcessing({ jobId: record.id, providerJobId: providerJob.providerJobId, providerRoute: provider.name, attempt: job.attemptsMade + 1 });

    let status = await provider.getStatus(providerJob);
    const config = getGenerationConfig();
    const pollIntervalMs = 5_000;
    const maxPolls = Math.ceil((config.jobTimeoutSeconds * 1000) / pollIntervalMs);
    for (let i = 0; i < maxPolls && (status === "queued" || status === "processing"); i += 1) {
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
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
    result = await provider.getResult(providerJob);
  }

  const finishedAt = Date.now();
  const inferenceMs = Math.max(finishedAt - submittedAt, 0);
  const totalMs = Math.max(finishedAt - Date.parse(record.created_at), 0);
  const startupMs = resumingExistingProviderJob && !usesServerlessRouter ? 0 : Math.max(submittedAt - attemptStartedAt, 0);
  const estimatedCostUsd = (inferenceMs / 1000) * getEstimatedVastCostRate(record.kind);
  await recordGenerationMetrics({
    jobId: record.id,
    attempt: job.attemptsMade + 1,
    startupMs,
    inferenceMs,
    totalMs,
    estimatedCostUsd,
  });
  if (!workflowManifest.outputMimeTypes.includes(result.contentType)) {
    throw new ProviderError("El MIME de salida no cumple el manifiesto del workflow.", "WORKFLOW_OUTPUT_INVALID", false);
  }
  const assetId = await persistGenerationOutput({ userId: record.user_id, jobId: record.id, kind: record.kind, result });
  await completeGenerationJob(record.id, [assetId]);
}

export function startGenerationWorkers() {
  const redisUrl = process.env.REDIS_URL?.trim();
  if (!redisUrl) throw new Error("REDIS_URL no está configurado.");
  const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
  activeConnections.add(connection);
  const config = getGenerationConfig();
  assertSafeVastServerlessConfig();
  const configuredKinds = getConfiguredQueueKinds();
  if (configuredKinds.length === 0) throw new Error("WORKER_QUEUE_KINDS no contiene una cola válida.");

  installShutdownHandlers();
  connection.on("error", (error) => log("error", "Error de conexión Redis.", { error: error.message }));

  if (!config.enabled) {
    log("info", "Worker en modo inactivo; no consumirá jobs.", { kinds: configuredKinds, generationEnabled: false });
    return [];
  }

  log("info", "Iniciando generation workers.", { concurrency: config.workerConcurrency, maxAttempts: config.maxAttempts, kinds: configuredKinds });

  return configuredKinds.map((kind) => {
    const worker = new Worker<WorkerPayload>(`generation-${kind}`, async (job) => {
      log("info", `Procesando job.`, { kind, jobId: job.data.jobId, attempt: job.attemptsMade + 1 });
      let budgetClaim = null;
      try {
        budgetClaim = await claimVastTestBudget(job.data.jobId, kind);
        await processGenerationJob(job);
        log("info", `Job completado.`, { kind, jobId: job.data.jobId });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Error de worker.";
        const retryable = error instanceof ProviderError ? error.retryable : true;
        log("warn", `Job falló.`, { kind, jobId: job.data.jobId, error: message, retryable, attempt: job.attemptsMade + 1 });
        await recordGenerationFailure({ jobId: job.data.jobId, code: message, message, retryable }).catch(() => undefined);
        if (!retryable) {
          throw new UnrecoverableError(message);
        }
        throw error;
      } finally {
        const budget = await finalizeVastTestBudget(budgetClaim).catch((error) => {
          log("error", "No se pudo cerrar la medición del presupuesto Vast.", { kind, jobId: job.data.jobId, error: String(error) });
          return null;
        });
        if (budget) {
          log(budget.overBudget ? "error" : "info", "Presupuesto Vast medido.", {
            kind,
            jobId: job.data.jobId,
            jobCostUsd: budget.jobCostUsd,
            totalSpentUsd: budget.totalSpentUsd,
            overBudget: budget.overBudget,
          });
          await recordGenerationActualCost({
            jobId: job.data.jobId,
            attempt: job.attemptsMade + 1,
            balanceBeforeUsd: budget.beforeBalanceUsd,
            balanceAfterUsd: budget.afterBalanceUsd,
            actualCostUsd: budget.jobCostUsd,
          }).catch((error) => log("warn", "No se pudo persistir el coste real Vast.", { kind, jobId: job.data.jobId, error: String(error) }));
        }
      }
    }, { connection, prefix: process.env.BULLMQ_PREFIX ?? "bellas-artes", concurrency: config.workerConcurrency });

    // Dead-letter queue: when a job exhausts all retries, move it to the DLQ
    worker.on("failed", async (job, error) => {
      const terminal = error.name === "UnrecoverableError"
        || Boolean(job && job.attemptsMade >= (job.opts.attempts ?? config.maxAttempts));
      if (job && terminal) {
        log("error", `Job agotó reintentos, moviendo a DLQ.`, { kind, jobId: job.data.jobId, attempts: job.attemptsMade, error: error.message });
        await recordGenerationFailure({ jobId: job.data.jobId, code: error.message, message: error.message, retryable: false }).catch(() => undefined);
        await refundGenerationJob({ jobId: job.data.jobId, code: error.message, message: error.message }).catch((refundError) => {
          log("error", `No se pudo reembolsar el job terminal.`, { kind, jobId: job.data.jobId, error: String(refundError) });
        });
        await moveToDLQ({
          kind: kind as GenerationQueueKind,
          jobId: job.data.jobId,
          error: error.message,
          attempts: job.attemptsMade,
        }).catch((dlqError) => log("error", `No se pudo mover a DLQ.`, { kind, jobId: job.data.jobId, error: String(dlqError) }));
      }
    });

    worker.on("error", (error) => {
      log("error", `Error en worker.`, { kind, error: error.message });
    });

    log("info", `Worker ${kind} iniciado.`, { kind });
    activeWorkers.add(worker);
    return worker;
  });
}

export function getConfiguredQueueKinds(value = process.env.WORKER_QUEUE_KINDS ?? "image,video,audio,character,world") {
  return [...new Set(value
    .split(",")
    .map((kind) => kind.trim())
    .filter((kind): kind is GenerationQueueKind => ["image", "video", "audio", "character", "world"].includes(kind)))];
}

function installShutdownHandlers() {
  if (shutdownHandlersInstalled) return;
  shutdownHandlersInstalled = true;
  const shutdown = async (signal: string) => {
    log("info", "Cerrando generation worker.", { signal });
    await Promise.allSettled([...activeWorkers].map((worker) => worker.close()));
    await Promise.allSettled([...activeConnections].map((connection) => connection.quit()));
    process.exit(0);
  };
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
  process.once("SIGINT", () => void shutdown("SIGINT"));
}

if (process.env.RUN_GENERATION_WORKER === "true") startGenerationWorkers();
