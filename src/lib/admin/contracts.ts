import type { GenerationAccessMode, GenerationBillingMode, ProviderRoute } from "@/lib/generation/config";
import type { GenerationQueueKind } from "@/lib/generation/queue";

export const adminDashboardWindows = ["24h", "7d", "30d"] as const;
export type AdminDashboardWindow = (typeof adminDashboardWindows)[number];

export type ServiceHealthState =
  | "healthy"
  | "degraded"
  | "stale"
  | "stopped"
  | "not_configured"
  | "error";

export type RuntimeSummary = {
  environmentEnabled: boolean;
  emergencyPaused: boolean;
  effectiveEnabled: boolean;
  accessMode: GenerationAccessMode;
  billingMode: GenerationBillingMode;
  provider: ProviderRoute | null;
  pauseReason: string | null;
  pausedAt: string | null;
};

export type BusinessAndGenerationMetrics = {
  usersTotal: number;
  usersNew: number;
  betaUsers: number;
  jobsTotal: number;
  jobsCompleted: number;
  jobsFailed: number;
  jobsCanceled: number;
  successRate: number;
};

export type ServiceHealth = {
  key: string;
  label: string;
  state: ServiceHealthState;
  summary: string;
  observedAt: string | null;
};

export type QueueSummary = {
  kind: GenerationQueueKind;
  queued: number;
  processing: number;
  failed: number;
  dlq: number;
  oldestQueuedAt: string | null;
  workflowConfigured: boolean;
  workerAvailable: boolean;
};

export type InterventionSummary = {
  payments: number;
  failedJobs: number;
  dlq: number;
  refundMismatches: number;
  moderation: number;
  expiredAssets: number;
  total: number;
};

export type AdminRecentJob = {
  id: string;
  userLabel: string;
  kind: GenerationQueueKind;
  workflowVersion: string;
  status: "queued" | "processing" | "completed" | "failed" | "canceled";
  attempts: number;
  durationMs: number | null;
  actualCostUsd: number | null;
  estimatedCostUsd: number | null;
  quotedCredits: number;
  capturedCredits: number;
  refundedCredits: number;
  createdAt: string;
};

export type GenerationCostSummary = {
  actualUsd: number;
  estimatedUsd: number;
  averageActualUsdPerCompletedOutput: number;
  quotedCredits: number;
  capturedCredits: number;
  refundedCredits: number;
};

export type AdminDashboardSnapshot = {
  generatedAt: string;
  window: AdminDashboardWindow;
  runtime: RuntimeSummary;
  metrics: BusinessAndGenerationMetrics;
  services: ServiceHealth[];
  queues: QueueSummary[];
  interventions: InterventionSummary;
  recentJobs: AdminRecentJob[];
  costs: GenerationCostSummary;
};

export function parseAdminDashboardWindow(value: string | null | undefined): AdminDashboardWindow {
  return adminDashboardWindows.includes(value as AdminDashboardWindow)
    ? value as AdminDashboardWindow
    : "24h";
}

export function getAdminDashboardSince(window: AdminDashboardWindow, now = new Date()) {
  const hours = window === "24h" ? 24 : window === "7d" ? 24 * 7 : 24 * 30;
  return new Date(now.getTime() - hours * 60 * 60 * 1_000);
}

export function calculateGenerationSuccessRate(completed: number, failed: number) {
  const terminal = completed + failed;
  return terminal === 0 ? 0 : Math.round((completed / terminal) * 10_000) / 100;
}

export function classifyHeartbeat(
  reportedStatus: "healthy" | "stopped" | "error",
  observedAt: string,
  now = new Date(),
): ServiceHealthState {
  if (reportedStatus === "stopped" || reportedStatus === "error") return reportedStatus;
  const ageSeconds = (now.getTime() - Date.parse(observedAt)) / 1_000;
  if (!Number.isFinite(ageSeconds) || ageSeconds > 180) return "stale";
  if (ageSeconds > 90) return "degraded";
  return "healthy";
}

export function maskAdminUserLabel(email: string | null | undefined, userId: string) {
  const [local, domain] = (email ?? "").split("@");
  if (!local || !domain) return `Usuario ${userId.slice(0, 8)}`;
  const visible = local.slice(0, Math.min(3, local.length));
  return `${visible}${"•".repeat(Math.max(Math.min(local.length - visible.length, 5), 2))}@${domain}`;
}
