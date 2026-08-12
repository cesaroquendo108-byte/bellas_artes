import "server-only";

import {
  calculateGenerationSuccessRate,
  classifyHeartbeat,
  getAdminDashboardSince,
  maskAdminUserLabel,
  type AdminDashboardSnapshot,
  type AdminDashboardWindow,
  type AdminRecentJob,
  type QueueSummary,
  type ServiceHealth,
} from "@/lib/admin/contracts";
import { getGenerationRuntimeControl } from "@/lib/admin/runtime-controls";
import { listGenerationCapabilities } from "@/lib/generation/capabilities";
import { getGenerationConfig } from "@/lib/generation/config";
import { generationQueueNames, type GenerationQueueKind } from "@/lib/generation/queue";
import { createAdminClient } from "@/utils/supabase/admin";

type MetricsPayload = {
  usersTotal?: unknown;
  usersNew?: unknown;
  betaUsers?: unknown;
  jobsTotal?: unknown;
  jobsCompleted?: unknown;
  jobsFailed?: unknown;
  jobsCanceled?: unknown;
  paymentsPending?: unknown;
  moderationPending?: unknown;
  refundMismatches?: unknown;
  expiredAssets?: unknown;
  quotedCredits?: unknown;
  capturedCredits?: unknown;
  refundedCredits?: unknown;
  actualCostUsd?: unknown;
  estimatedCostUsd?: unknown;
  queues?: unknown;
};

type HeartbeatRow = {
  service_key: string;
  reported_status: "healthy" | "stopped" | "error";
  details: Record<string, unknown> | null;
  observed_at: string;
};

type QueueMetricRow = {
  kind?: unknown;
  queued?: unknown;
  processing?: unknown;
  failed?: unknown;
  oldestQueuedAt?: unknown;
};

export async function getAdminDashboardSnapshot(
  window: AdminDashboardWindow,
  now = new Date(),
): Promise<AdminDashboardSnapshot> {
  const admin = createAdminClient();
  const since = getAdminDashboardSince(window, now).toISOString();
  const [metricsResult, runtimeControl, heartbeatsResult, recentJobsResult] = await Promise.all([
    admin.rpc("get_admin_dashboard_metrics", { p_since: since }),
    getGenerationRuntimeControl(),
    admin.from("service_heartbeats").select("service_key,reported_status,details,observed_at"),
    admin.from("generation_jobs")
      .select("id,user_id,kind,workflow_version,status,attempts,quoted_credits,credits_captured,credits_refunded,created_at,started_at,completed_at")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  if (metricsResult.error) throw new Error(`No se pudieron calcular las métricas: ${metricsResult.error.message}`);
  if (heartbeatsResult.error) throw new Error(`No se pudieron consultar los heartbeats: ${heartbeatsResult.error.message}`);
  if (recentJobsResult.error) throw new Error(`No se pudieron consultar los jobs recientes: ${recentJobsResult.error.message}`);

  const metric = (metricsResult.data ?? {}) as MetricsPayload;
  const recentRows = recentJobsResult.data ?? [];
  const userIds = [...new Set(recentRows.map((row) => String(row.user_id)))];
  const jobIds = recentRows.map((row) => String(row.id));
  const [usersResult, attemptsResult] = await Promise.all([
    userIds.length
      ? admin.from("users").select("id,email").in("id", userIds)
      : Promise.resolve({ data: [], error: null }),
    jobIds.length
      ? admin.from("generation_job_attempts")
          .select("job_id,total_ms,actual_cost_usd,estimated_cost_usd")
          .in("job_id", jobIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (usersResult.error) throw new Error(`No se pudieron consultar los usuarios recientes: ${usersResult.error.message}`);
  if (attemptsResult.error) throw new Error(`No se pudieron consultar los costes recientes: ${attemptsResult.error.message}`);

  const generatedAt = now.toISOString();
  const config = getGenerationConfig();
  const heartbeats = (heartbeatsResult.data ?? []) as HeartbeatRow[];
  const heartbeatByKey = new Map(heartbeats.map((heartbeat) => [heartbeat.service_key, heartbeat]));
  const usersById = new Map((usersResult.data ?? []).map((user) => [String(user.id), String(user.email ?? "")]));
  const attemptsByJob = groupAttempts(attemptsResult.data ?? []);
  const completed = toNumber(metric.jobsCompleted);
  const failed = toNumber(metric.jobsFailed);
  const actualUsd = toNumber(metric.actualCostUsd);
  const estimatedUsd = toNumber(metric.estimatedCostUsd);
  const queueMetrics = Array.isArray(metric.queues) ? metric.queues as QueueMetricRow[] : [];
  const capabilities = listGenerationCapabilities();
  const workerHeartbeat = heartbeatByKey.get("worker:generation");
  const workerProvider = heartbeatProvider(workerHeartbeat);
  const workerAvailable = workerHeartbeat
    ? classifyHeartbeat(workerHeartbeat.reported_status, workerHeartbeat.observed_at, now) === "healthy"
    : false;
  const queues = generationQueueNames.map((kind): QueueSummary => {
    const row = queueMetrics.find((candidate) => candidate.kind === kind);
    const heartbeat = heartbeatByKey.get(`queue:${kind}`);
    return {
      kind,
      queued: toNumber(row?.queued),
      processing: toNumber(row?.processing),
      failed: toNumber(row?.failed),
      dlq: toNumber(heartbeat?.details?.dlq),
      oldestQueuedAt: typeof row?.oldestQueuedAt === "string" ? row.oldestQueuedAt : null,
      workflowConfigured: capabilities.some((capability) => capability.kind === kind && capability.workflowConfigured),
      workerAvailable,
    };
  });
  const dlqTotal = queues.reduce((total, queue) => total + queue.dlq, 0);
  const interventions = {
    payments: toNumber(metric.paymentsPending),
    failedJobs: failed,
    dlq: dlqTotal,
    refundMismatches: toNumber(metric.refundMismatches),
    moderation: toNumber(metric.moderationPending),
    expiredAssets: toNumber(metric.expiredAssets),
    total: 0,
  };
  interventions.total = interventions.payments + interventions.failedJobs + interventions.dlq
    + interventions.refundMismatches + interventions.moderation + interventions.expiredAssets;

  return {
    generatedAt,
    window,
    runtime: {
      environmentEnabled: config.enabled,
      emergencyPaused: runtimeControl.emergencyPaused,
      effectiveEnabled: config.enabled && !runtimeControl.emergencyPaused,
      accessMode: config.accessMode,
      billingMode: config.billingMode,
      provider: config.route ?? workerProvider,
      pauseReason: runtimeControl.pauseReason,
      pausedAt: runtimeControl.pausedAt,
    },
    metrics: {
      usersTotal: toNumber(metric.usersTotal),
      usersNew: toNumber(metric.usersNew),
      betaUsers: toNumber(metric.betaUsers),
      jobsTotal: toNumber(metric.jobsTotal),
      jobsCompleted: completed,
      jobsFailed: failed,
      jobsCanceled: toNumber(metric.jobsCanceled),
      successRate: calculateGenerationSuccessRate(completed, failed),
    },
    services: buildServiceHealth(heartbeatByKey, config, generatedAt, now),
    queues,
    interventions,
    recentJobs: recentRows.map((row): AdminRecentJob => {
      const jobAttempts = attemptsByJob.get(String(row.id)) ?? [];
      const actualValues = jobAttempts.map((attempt) => nullableNumber(attempt.actual_cost_usd)).filter(isNumber);
      const estimatedValues = jobAttempts.map((attempt) => nullableNumber(attempt.estimated_cost_usd)).filter(isNumber);
      const durations = jobAttempts.map((attempt) => nullableNumber(attempt.total_ms)).filter(isNumber);
      return {
        id: String(row.id),
        userLabel: maskAdminUserLabel(usersById.get(String(row.user_id)), String(row.user_id)),
        kind: row.kind as GenerationQueueKind,
        workflowVersion: String(row.workflow_version),
        status: row.status as AdminRecentJob["status"],
        attempts: toNumber(row.attempts),
        durationMs: durations.length ? Math.max(...durations) : durationFromDates(row.started_at, row.completed_at),
        actualCostUsd: actualValues.length ? sum(actualValues) : null,
        estimatedCostUsd: estimatedValues.length ? sum(estimatedValues) : null,
        quotedCredits: toNumber(row.quoted_credits),
        capturedCredits: toNumber(row.credits_captured),
        refundedCredits: toNumber(row.credits_refunded),
        createdAt: String(row.created_at),
      };
    }),
    costs: {
      actualUsd,
      estimatedUsd,
      averageActualUsdPerCompletedOutput: completed > 0 ? actualUsd / completed : 0,
      quotedCredits: toNumber(metric.quotedCredits),
      capturedCredits: toNumber(metric.capturedCredits),
      refundedCredits: toNumber(metric.refundedCredits),
    },
  };
}

function buildServiceHealth(
  heartbeats: Map<string, HeartbeatRow>,
  config: ReturnType<typeof getGenerationConfig>,
  generatedAt: string,
  now: Date,
): ServiceHealth[] {
  const fromHeartbeat = (key: string, label: string, missingState: ServiceHealth["state"], missingSummary: string): ServiceHealth => {
    const heartbeat = heartbeats.get(key);
    if (!heartbeat) return { key, label, state: missingState, summary: missingSummary, observedAt: null };
    return {
      key,
      label,
      state: classifyHeartbeat(heartbeat.reported_status, heartbeat.observed_at, now),
      summary: heartbeatSummary(key, heartbeat.details),
      observedAt: heartbeat.observed_at,
    };
  };
  const r2Configured = ["CLOUDFLARE_R2_ACCOUNT_ID", "CLOUDFLARE_R2_ACCESS_KEY_ID", "CLOUDFLARE_R2_SECRET_ACCESS_KEY", "CLOUDFLARE_R2_BUCKET"]
    .every((key) => Boolean(process.env[key]?.trim()));
  const l2Configured = process.env.GENERATION_MODERATION_LEVEL === "l2"
    && process.env.GENERATION_MODERATION_PROVIDER === "openrouter"
    && Boolean(process.env.OPENROUTER_API_KEY?.trim())
    && Boolean(process.env.GENERATION_MODERATION_MODEL?.trim());
  const workerHeartbeat = heartbeats.get("worker:generation");
  const vastConfiguredByWorker = heartbeatProvider(workerHeartbeat) === "vast"
    && workerHeartbeat?.details?.hasVast === true
    && workerHeartbeat.details.serverlessSafe === true;

  return [
    { key: "web", label: "Aplicación", state: "healthy", summary: "La aplicación administrativa respondió.", observedAt: generatedAt },
    { key: "supabase", label: "Supabase", state: "healthy", summary: "Consultas administrativas disponibles.", observedAt: generatedAt },
    heartbeats.has("redis") || config.redisConfigured
      ? fromHeartbeat("redis", "Redis", "stale", "Configurado, sin heartbeat reciente del worker.")
      : { key: "redis", label: "Redis", state: "not_configured", summary: "REDIS_URL no está configurado.", observedAt: null },
    fromHeartbeat("worker:generation", "Worker BullMQ", config.enabled ? "stale" : "stopped", config.enabled ? "Sin heartbeat reciente." : "Generación deshabilitada; no consume jobs."),
    r2Configured
      ? { key: "r2", label: "Cloudflare R2", state: "degraded", summary: "Configurado; se valida durante operaciones privadas.", observedAt: null }
      : { key: "r2", label: "Cloudflare R2", state: "not_configured", summary: "Credenciales o bucket incompletos.", observedAt: null },
    config.hasVast || vastConfiguredByWorker
      ? { key: "vast", label: "Vast.ai", state: config.enabled ? "degraded" : "stopped", summary: config.enabled ? "Configurado; sin consulta que levante GPU." : "Generación deshabilitada; no se consulta el proveedor.", observedAt: null }
      : { key: "vast", label: "Vast.ai", state: "not_configured", summary: "No hay endpoint activo configurado.", observedAt: null },
    process.env.CRON_SECRET?.trim()
      ? fromHeartbeat("cron:assets-retention", "Retención de assets", "stale", "Configurado, aún sin ejecución observada.")
      : { key: "cron:assets-retention", label: "Retención de assets", state: "not_configured", summary: "CRON_SECRET no está configurado.", observedAt: null },
    l2Configured
      ? { key: "moderation", label: "Moderación L2", state: "healthy", summary: "Proveedor L2 configurado en modo fail-closed.", observedAt: generatedAt }
      : { key: "moderation", label: "Moderación", state: "stopped", summary: "Sólo filtro local; L2 no está activo.", observedAt: null },
  ];
}

function heartbeatProvider(heartbeat: HeartbeatRow | undefined): "vast" | "fake" | null {
  const provider = heartbeat?.details?.provider;
  return provider === "vast" || provider === "fake" ? provider : null;
}

function heartbeatSummary(key: string, details: Record<string, unknown> | null) {
  if (key === "worker:generation") {
    return details?.generationEnabled === true ? "Worker disponible para consumir jobs." : "Worker sano en modo inactivo.";
  }
  if (key === "redis") return "PING confirmado por el worker.";
  if (key.startsWith("cron:")) return details?.failures ? "La última limpieza terminó con incidencias." : "Última ejecución completada.";
  return "Heartbeat recibido.";
}

function groupAttempts(rows: Array<Record<string, unknown>>) {
  const result = new Map<string, Array<Record<string, unknown>>>();
  for (const row of rows) {
    const key = String(row.job_id);
    result.set(key, [...(result.get(key) ?? []), row]);
  }
  return result;
}

function durationFromDates(startedAt: unknown, completedAt: unknown) {
  if (typeof startedAt !== "string" || typeof completedAt !== "string") return null;
  const duration = Date.parse(completedAt) - Date.parse(startedAt);
  return Number.isFinite(duration) && duration >= 0 ? duration : null;
}

function nullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toNumber(value: unknown) {
  return nullableNumber(value) ?? 0;
}

function isNumber(value: number | null): value is number {
  return value !== null;
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}
