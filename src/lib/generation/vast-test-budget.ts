import Redis from "ioredis";
import { getGenerationConfig, type GenerationProviderKind } from "./config";
import { ProviderError } from "./providers/types";

export interface VastTestBudgetClaim {
  beforeBalanceUsd: number;
  baselineBalanceUsd: number;
  runId: string;
}

export async function claimVastTestBudget(jobId: string, kind: GenerationProviderKind): Promise<VastTestBudgetClaim | null> {
  const config = getGenerationConfig().vastTest;
  if (!config.enabled) return null;
  if (!config.runId || !config.modality) {
    throw new ProviderError("El arnés Vast requiere VAST_TEST_RUN_ID y VAST_TEST_MODALITY.", "VAST_TEST_CONFIG_INVALID", false);
  }
  if (kind !== config.modality) {
    throw new ProviderError("La modalidad no está aprobada para esta pasada Vast.", "VAST_TEST_MODALITY_BLOCKED", false);
  }

  const beforeBalanceUsd = await getVastCreditBalance();
  const redis = createRedis();
  const namespace = budgetNamespace(config.runId);
  try {
    const baselineKey = `${namespace}:baseline`;
    await redis.set(baselineKey, String(beforeBalanceUsd), "NX");
    const baselineBalanceUsd = Number(await redis.get(baselineKey));
    if (!Number.isFinite(baselineBalanceUsd)) {
      throw new ProviderError("No se pudo fijar el saldo inicial Vast.", "VAST_TEST_BASELINE_INVALID", false);
    }
    const spentBefore = Math.max(baselineBalanceUsd - beforeBalanceUsd, 0);
    if (spentBefore >= config.budgetUsd) {
      throw new ProviderError("El presupuesto aprobado de Vast ya fue consumido.", "VAST_TEST_BUDGET_EXHAUSTED", false);
    }

    const jobsKey = `${namespace}:jobs`;
    const added = await redis.sadd(jobsKey, jobId);
    const count = await redis.scard(jobsKey);
    if (count > config.maxJobs) {
      if (added) await redis.srem(jobsKey, jobId);
      throw new ProviderError("Se alcanzó el máximo de jobs reales aprobado.", "VAST_TEST_MAX_JOBS", false);
    }
    await redis.expire(jobsKey, 7 * 24 * 60 * 60);
    await redis.expire(baselineKey, 7 * 24 * 60 * 60);
    return { beforeBalanceUsd, baselineBalanceUsd, runId: config.runId };
  } finally {
    redis.disconnect();
  }
}

export async function finalizeVastTestBudget(claim: VastTestBudgetClaim | null) {
  if (!claim) return null;
  const afterBalanceUsd = await getVastCreditBalance();
  const jobCostUsd = roundUsd(Math.max(claim.beforeBalanceUsd - afterBalanceUsd, 0));
  const totalSpentUsd = roundUsd(Math.max(claim.baselineBalanceUsd - afterBalanceUsd, 0));
  const config = getGenerationConfig().vastTest;
  return {
    beforeBalanceUsd: claim.beforeBalanceUsd,
    afterBalanceUsd,
    jobCostUsd,
    totalSpentUsd,
    overBudget: totalSpentUsd > config.budgetUsd,
  };
}

async function getVastCreditBalance() {
  const apiKey = process.env.VAST_API_KEY?.trim();
  if (!apiKey) throw new ProviderError("VAST_API_KEY no está configurada.", "VAST_API_KEY_MISSING", false);
  const response = await fetch("https://console.vast.ai/api/v0/users/current/", {
    headers: { accept: "application/json", authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(getGenerationConfig().requestTimeoutMs),
  });
  if (!response.ok) {
    const retryable = response.status === 429 || response.status >= 500;
    throw new ProviderError(`Vast billing respondió ${response.status}.`, `VAST_BILLING_HTTP_${response.status}`, retryable);
  }
  const payload = await response.json() as { credit?: unknown };
  const balance = Number(payload.credit);
  if (!Number.isFinite(balance) || balance < 0) {
    throw new ProviderError("Vast no devolvió un saldo válido.", "VAST_BILLING_INVALID", false);
  }
  return balance;
}

function createRedis() {
  const redisUrl = process.env.REDIS_URL?.trim();
  if (!redisUrl) throw new ProviderError("REDIS_URL no está configurado.", "REDIS_NOT_CONFIGURED", false);
  return new Redis(redisUrl, { maxRetriesPerRequest: 1, connectTimeout: 5_000, commandTimeout: 5_000 });
}

function budgetNamespace(runId: string) {
  return `${process.env.BULLMQ_PREFIX ?? "bellas-artes"}:vast-test:${runId.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

function roundUsd(value: number) {
  return Math.round(value * 1_000_000) / 1_000_000;
}
