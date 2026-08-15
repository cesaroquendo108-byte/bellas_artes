import { Worker, type Job } from "bullmq";
import Redis from "ioredis";

import { recordServiceHeartbeat } from "@/lib/admin/service-heartbeats";
import { expireVastAdminLease, reconcileVastAdminLeases } from "@/lib/admin/vast-service";
import { getVastLifecycleBackend, getVastLifecycleQueue, vastLifecycleQueueName } from "@/lib/admin/vast-lifecycle-queue";

type LifecyclePayload = { leaseId: string };

let lifecycleWorker: Worker<LifecyclePayload> | null = null;
let lifecycleConnection: Redis | null = null;
let heartbeatInterval: NodeJS.Timeout | null = null;
let reconciliationInterval: NodeJS.Timeout | null = null;
let handlersInstalled = false;
let lifecycleStarted = false;

function log(level: "info" | "warn" | "error", message: string, meta?: Record<string, unknown>) {
  const entry = { ts: new Date().toISOString(), level, service: "vast-admin-lifecycle", message, ...redact(meta ?? {}) };
  if (level === "error") console.error(JSON.stringify(entry));
  else console.log(JSON.stringify(entry));
}

export function startVastLifecycleWorker() {
  if (lifecycleStarted) return lifecycleWorker;
  const enabled = process.env.VAST_ADMIN_LIFECYCLE_ENABLED === "true";
  if (!enabled) {
    void recordServiceHeartbeat({
      serviceKey: "worker:vast-admin-lifecycle",
      status: "stopped",
      details: { lifecycleEnabled: false },
    });
    return null;
  }
  if (!process.env.VAST_LIFECYCLE_API_KEY?.trim()) throw new Error("VAST_LIFECYCLE_API_KEY no está configurada.");
  const backend = getVastLifecycleBackend();

  if (backend === "queue") {
    const redisUrl = process.env.REDIS_URL?.trim();
    if (!redisUrl) throw new Error("REDIS_URL no está configurado para el ciclo de vida Vast con backend queue.");
    lifecycleConnection = new Redis(redisUrl, { maxRetriesPerRequest: null });
    lifecycleWorker = new Worker<LifecyclePayload>(vastLifecycleQueueName, processLifecycleJob, {
      connection: lifecycleConnection,
      prefix: process.env.BULLMQ_PREFIX ?? "bellas-artes",
      concurrency: 1,
    });
    lifecycleWorker.on("completed", (job) => log("info", "Alquiler vencido procesado.", { jobId: job.id, leaseId: job.data.leaseId }));
    lifecycleWorker.on("failed", (job, error) => log("error", "Falló la autodestrucción de un alquiler.", {
      jobId: job?.id ?? null,
      leaseId: job?.data.leaseId ?? null,
      error: error.message,
      attemptsMade: job?.attemptsMade ?? 0,
    }));
    lifecycleWorker.on("error", (error) => log("error", "Error del worker de ciclo de vida.", { error: error.message }));
  }
  lifecycleStarted = true;

  const heartbeat = async () => {
    try {
      const counts = backend === "queue"
        ? await getVastLifecycleQueue().getJobCounts("waiting", "active", "delayed", "failed")
        : null;
      await recordServiceHeartbeat({
        serviceKey: "worker:vast-admin-lifecycle",
        status: "healthy",
        details: {
          lifecycleEnabled: true,
          backend,
          concurrency: 1,
          waiting: counts?.waiting ?? 0,
          active: counts?.active ?? 0,
          delayed: counts?.delayed ?? 0,
          failed: counts?.failed ?? 0,
        },
      });
    } catch (error) {
      log("warn", "No se pudo registrar el heartbeat.", { error: error instanceof Error ? error.message : String(error) });
      await recordServiceHeartbeat({
        serviceKey: "worker:vast-admin-lifecycle",
        status: "error",
        details: { lifecycleEnabled: true },
      }).catch(() => undefined);
    }
  };
  const reconcile = async () => {
    try {
      const result = await reconcileVastAdminLeases();
      if (result.destroyed || result.orphansDestroyed) log("warn", "Reconciliación Vast ejecutó limpieza.", result);
    } catch (error) {
      log("error", "Falló la reconciliación Vast.", { error: error instanceof Error ? error.message : String(error) });
    }
  };
  void heartbeat();
  void reconcile();
  heartbeatInterval = setInterval(() => void heartbeat(), 30_000);
  reconciliationInterval = setInterval(() => void reconcile(), 30_000);
  installShutdownHandlers();
  log("info", "Worker de ciclo de vida iniciado.", { backend, concurrency: 1 });
  return lifecycleWorker;
}

async function processLifecycleJob(job: Job<LifecyclePayload>) {
  if (job.name !== "destroy-lease" || !/^[0-9a-f-]{36}$/.test(job.data.leaseId)) {
    throw new Error("VAST_LIFECYCLE_JOB_INVALID");
  }
  await expireVastAdminLease(job.data.leaseId);
}

function installShutdownHandlers() {
  if (handlersInstalled) return;
  handlersInstalled = true;
  const shutdown = async (signal: string) => {
    log("info", "Cerrando worker de ciclo de vida.", { signal });
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    if (reconciliationInterval) clearInterval(reconciliationInterval);
    await lifecycleWorker?.close();
    await lifecycleConnection?.quit();
  };
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
  process.once("SIGINT", () => void shutdown("SIGINT"));
}

function redact(meta: Record<string, unknown>) {
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta)) {
    if (/key|token|secret|password|env|response/i.test(key)) continue;
    safe[key] = typeof value === "string" ? value.slice(0, 300) : value;
  }
  return safe;
}

if (process.env.RUN_VAST_LIFECYCLE_WORKER === "true") startVastLifecycleWorker();
