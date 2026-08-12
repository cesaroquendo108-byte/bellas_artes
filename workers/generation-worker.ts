import { UnrecoverableError, Worker, type Job } from "bullmq";
import Redis from "ioredis";
import { assertSafeVastServerlessConfig, getEstimatedVastCostRate, getGenerationConfig, getVastServerlessEndpointName } from "@/lib/generation/config";
import { completeGenerationJob, getGenerationJob, markGenerationProcessing, recordGenerationActualCost, recordGenerationFailure, recordGenerationMetrics, refundGenerationJob, verifyOwnedAssets } from "@/lib/generation/db";
import { persistGenerationOutput } from "@/lib/generation/output";
import { getProvider, selectProvider, ProviderError, type ProviderJob, type ProviderResult } from "@/lib/generation/providers";
import { getPrivateObjectUrl } from "@/lib/storage/r2";
import { getDeadLetterQueue, getGenerationQueue, moveToDLQ, type GenerationQueueKind } from "@/lib/generation/queue";
import { claimVastTestBudget, finalizeVastTestBudget } from "@/lib/generation/vast-test-budget";
import { loadWorkflowManifest, validateWorkflowAssets } from "@/lib/generation/workflow-manifests";
import { recordServiceHeartbeat } from "@/lib/admin/service-heartbeats";

type WorkerPayload = { jobId: string };
const activeConnections = new Set<Redis>();
const activeWorkers = new Set<Worker<WorkerPayload>>();
const activeHeartbeatIntervals = new Set<NodeJS.Timeout>();
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
  let providerTimings: Record<string, number> | undefined;

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
      providerTimings = execution.timings;
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
  const timings = resolveProviderTimingMetrics(providerTimings, {
    inferenceMs: Math.max(finishedAt - submittedAt, 0),
    totalMs: Math.max(finishedAt - Date.parse(record.created_at), 0),
    startupMs: resumingExistingProviderJob && !usesServerlessRouter ? 0 : Math.max(submittedAt - attemptStartedAt, 0),
  });
  const { startupMs, inferenceMs, totalMs } = timings;
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
  startHeartbeatLoop(connection, configuredKinds, config.enabled, config.workerConcurrency, {
    provider: config.route,
    hasVast: config.hasVast,
    serverlessSafe: config.vastServerless.safe,
  });

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
          log(budget.overBudget || budget.overSessionBudget ? "error" : "info", "Presupuesto Vast medido.", {
            kind,
            jobId: job.data.jobId,
            jobCostUsd: budget.jobCostUsd,
            totalSpentUsd: budget.totalSpentUsd,
            overBudget: budget.overBudget,
            sessionSpentUsd: budget.sessionSpentUsd,
            sessionCeilingUsd: budget.sessionCeilingUsd,
            overSessionBudget: budget.overSessionBudget,
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

function startHeartbeatLoop(
  connection: Redis,
  kinds: GenerationQueueKind[],
  generationEnabled: boolean,
  concurrency: number,
  provider: { provider: string | null; hasVast: boolean; serverlessSafe: boolean },
) {
  const report = async () => {
    try {
      const pong = await connection.ping();
      await recordServiceHeartbeat({
        serviceKey: "redis",
        status: pong === "PONG" ? "healthy" : "error",
        details: { pong: pong === "PONG" },
      });
      await Promise.all(kinds.map(async (kind) => {
        const [counts, dlqCounts] = await Promise.all([
          getGenerationQueue(kind).getJobCounts("waiting", "active", "failed"),
          getDeadLetterQueue(kind).getJobCounts("waiting", "active", "failed", "delayed"),
        ]);
        await recordServiceHeartbeat({
          serviceKey: `queue:${kind}`,
          status: generationEnabled ? "healthy" : "stopped",
          details: {
            waiting: counts.waiting ?? 0,
            active: counts.active ?? 0,
            failed: counts.failed ?? 0,
            dlq: (dlqCounts.waiting ?? 0) + (dlqCounts.active ?? 0) + (dlqCounts.failed ?? 0) + (dlqCounts.delayed ?? 0),
          },
        });
      }));
      await recordServiceHeartbeat({
        serviceKey: "worker:generation",
        status: generationEnabled ? "healthy" : "stopped",
        details: {
          generationEnabled,
          concurrency,
          kinds: kinds.join(","),
          provider: provider.provider,
          hasVast: provider.hasVast,
          serverlessSafe: provider.serverlessSafe,
        },
      });
    } catch (error) {
      log("warn", "No se pudo actualizar el heartbeat del worker.", {
        error: error instanceof Error ? error.message : String(error),
      });
      await recordServiceHeartbeat({
        serviceKey: "worker:generation",
        status: "error",
        details: { generationEnabled, concurrency, provider: provider.provider },
      }).catch(() => undefined);
    }
  };

  void report();
  const interval = setInterval(() => void report(), 30_000);
  interval.unref();
  activeHeartbeatIntervals.add(interval);
}

export function getConfiguredQueueKinds(value = process.env.WORKER_QUEUE_KINDS ?? "image,video,audio,character,world") {
  return [...new Set(value
    .split(",")
    .map((kind) => kind.trim())
    .filter((kind): kind is GenerationQueueKind => ["image", "video", "audio", "character", "world"].includes(kind)))];
}

type TimingMetrics = { startupMs: number; inferenceMs: number; totalMs: number };

export function resolveProviderTimingMetrics(providerTimings: Record<string, number> | undefined, fallback: TimingMetrics): TimingMetrics {
  return {
    startupMs: readProviderDuration(providerTimings, ["startup_ms", "startupMs", "cold_start_ms", "coldStartMs"], ["startup_seconds", "cold_start_seconds"]) ?? fallback.startupMs,
    inferenceMs: readProviderDuration(providerTimings, ["inference_ms", "inferenceMs", "execution_ms", "executionMs"], ["inference_seconds", "execution_seconds"]) ?? fallback.inferenceMs,
    totalMs: readProviderDuration(providerTimings, ["total_ms", "totalMs", "duration_ms", "durationMs"], ["total_seconds", "duration_seconds"]) ?? fallback.totalMs,
  };
}

function readProviderDuration(
  timings: Record<string, number> | undefined,
  millisecondKeys: string[],
  secondKeys: string[],
) {
  for (const key of millisecondKeys) {
    const value = timings?.[key];
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) return Math.round(value);
  }
  for (const key of secondKeys) {
    const value = timings?.[key];
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) return Math.round(value * 1_000);
  }
  return undefined;
}

function installShutdownHandlers() {
  if (shutdownHandlersInstalled) return;
  shutdownHandlersInstalled = true;
  const shutdown = async (signal: string) => {
    log("info", "Cerrando generation worker.", { signal });
    activeHeartbeatIntervals.forEach((interval) => clearInterval(interval));
    activeHeartbeatIntervals.clear();
    await Promise.allSettled([...activeWorkers].map((worker) => worker.close()));
    await Promise.allSettled([...activeConnections].map((connection) => connection.quit()));
    process.exit(0);
  };
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
  process.once("SIGINT", () => void shutdown("SIGINT"));
}

if (process.env.RUN_GENERATION_WORKER === "true") startGenerationWorkers();
