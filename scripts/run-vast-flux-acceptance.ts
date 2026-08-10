import { createHash } from "node:crypto";
import { createAdminClient } from "@/utils/supabase/admin";
import { getGenerationConfig } from "@/lib/generation/config";
import { resolveImageRoute } from "@/lib/generation/registry";
import { enqueueGeneration } from "@/lib/generation/service";
import { enqueueGenerationJob } from "@/lib/generation/queue";
import { downloadPrivateObject, getPrivateObjectUrl } from "@/lib/storage/r2";

const TEST_ACCOUNT_PURPOSE = "flux-acceptance-20260810";
const EXPECTED_WORKFLOW = "image/flux-schnell-v1";
const EXPECTED_ENDPOINT = "ba-image-sandbox";
const TERMINAL = new Set(["completed", "failed", "canceled"]);

const cases = [
  {
    label: "smoke-1",
    prompt: "A refined ceramic sculpture in a quiet museum gallery, soft daylight, editorial photography",
    seed: 41001,
  },
  {
    label: "smoke-2",
    prompt: "A luminous tropical botanical study on deep indigo paper, elegant fine-art print",
    seed: 41002,
  },
  {
    label: "acceptance-pipeline",
    prompt: "A contemporary Venezuelan art pavilion at dusk, cinematic architectural photography",
    seed: 41003,
  },
  {
    label: "acceptance-private-asset",
    prompt: "An archival still life with cacao, handmade paper and brass, dramatic studio light",
    seed: 41004,
  },
  {
    label: "acceptance-polling-scale-zero",
    prompt: "A surreal cloud garden above Caracas, sophisticated concept art, atmospheric depth",
    seed: 41005,
  },
] as const;

function emit(event: string, details: Record<string, unknown>) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), event, ...details }));
}

function requireSafeConfiguration() {
  const config = getGenerationConfig();
  const endpoint = process.env.VAST_IMAGE_SERVERLESS_ENDPOINT?.trim();
  if (!config.enabled || !config.adminOnly || config.billingMode !== "shadow" || config.route !== "vast") {
    throw new Error("La aceptación exige generación activa, admin-only, billing shadow y proveedor Vast.");
  }
  if (!config.vastServerless.safe || endpoint !== EXPECTED_ENDPOINT) {
    throw new Error("La configuración Vast no coincide con el endpoint seguro 0/0/1/600.");
  }
  if (!config.vastTest.enabled || config.vastTest.modality !== "image" || config.vastTest.maxJobs !== 5 || config.vastTest.budgetUsd > 0.5) {
    throw new Error("El arnés debe limitarse a cinco jobs de imagen y US$0.50.");
  }
  if (!config.vastTest.runId) throw new Error("Falta VAST_TEST_RUN_ID.");
  return config;
}

async function findServiceAdminId() {
  const admin = createAdminClient();
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 50 });
    if (error) throw error;
    const account = data.users.find((user) => user.app_metadata?.purpose === TEST_ACCOUNT_PURPOSE);
    if (account) {
      const { data: profile, error: profileError } = await admin.from("users").select("role").eq("id", account.id).maybeSingle();
      if (profileError) throw profileError;
      if (profile?.role !== "admin") throw new Error("La cuenta técnica no tiene rol admin.");
      return account.id;
    }
    if (data.users.length < 50) break;
  }
  throw new Error("No existe la cuenta técnica admin de aceptación.");
}

async function vastBalance() {
  const response = await fetch("https://console.vast.ai/api/v0/users/current/", {
    headers: { authorization: `Bearer ${process.env.VAST_API_KEY}` },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Vast billing respondió ${response.status}.`);
  const payload = await response.json() as { credit?: unknown };
  const value = Number(payload.credit);
  if (!Number.isFinite(value)) throw new Error("Vast no devolvió un saldo válido.");
  return value;
}

async function waitForTerminal(jobId: string, timeoutMs = 20 * 60_000) {
  const admin = createAdminClient();
  const deadline = Date.now() + timeoutMs;
  let previous: string | null = null;
  while (Date.now() < deadline) {
    const { data, error } = await admin.from("generation_jobs").select("*").eq("id", jobId).single();
    if (error) throw error;
    if (data.status !== previous) {
      emit("job-status", { jobId, status: data.status, attempts: data.attempts });
      previous = data.status;
    }
    if (TERMINAL.has(data.status)) return data;
    await new Promise((resolve) => setTimeout(resolve, 5_000));
  }
  throw new Error(`Timeout esperando el job ${jobId}.`);
}

async function waitForAttemptCost(jobId: string) {
  const admin = createAdminClient();
  for (let index = 0; index < 15; index += 1) {
    const { data, error } = await admin
      .from("generation_job_attempts")
      .select("attempt,startup_ms,inference_ms,total_ms,estimated_cost_usd,actual_cost_usd,vast_balance_before_usd,vast_balance_after_usd,status")
      .eq("job_id", jobId)
      .order("attempt", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (data?.actual_cost_usd !== null && data?.actual_cost_usd !== undefined) return data;
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
  throw new Error(`No se persistió el coste real del job ${jobId}.`);
}

async function verifyPrivateAsset(userId: string, jobId: string) {
  const admin = createAdminClient();
  const { data: links, error: linksError } = await admin
    .from("generation_job_assets")
    .select("asset_id")
    .eq("job_id", jobId)
    .eq("role", "output");
  if (linksError) throw linksError;
  if (links.length !== 1) throw new Error(`El job ${jobId} no tiene exactamente un output.`);
  const assetId = links[0].asset_id as string;
  const { data: asset, error: assetError } = await admin
    .from("assets")
    .select("id,user_id,r2_key,mime_type,bytes,metadata")
    .eq("id", assetId)
    .single();
  if (assetError) throw assetError;
  if (asset.user_id !== userId || !asset.r2_key.startsWith(`users/${userId}/generated/image/`)) {
    throw new Error(`Ownership o ruta privada inválida para ${assetId}.`);
  }
  const bytes = await downloadPrivateObject(asset.r2_key);
  const checksum = createHash("sha256").update(bytes).digest("hex");
  const metadata = asset.metadata as Record<string, unknown> | null;
  if (metadata?.sha256 !== checksum || asset.bytes !== bytes.byteLength) throw new Error(`Checksum o tamaño inválido para ${assetId}.`);
  const signedUrl = await getPrivateObjectUrl(asset.r2_key, 120);
  const signedResponse = await fetch(signedUrl, { signal: AbortSignal.timeout(30_000) });
  if (!signedResponse.ok) throw new Error(`La URL firmada respondió ${signedResponse.status}.`);
  const signedBytes = new Uint8Array(await signedResponse.arrayBuffer());
  if (createHash("sha256").update(signedBytes).digest("hex") !== checksum) throw new Error("La URL firmada no devolvió el asset esperado.");
  return { assetId, checksum, bytes: bytes.byteLength, mimeType: asset.mime_type, signedUrlVerified: true };
}

async function waitForScaleZero(timeoutMs = 15 * 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const response = await fetch("https://run.vast.ai/get_workergroup_workers/", {
      method: "POST",
      headers: { authorization: `Bearer ${process.env.VAST_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({ id: 41706 }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`Vast workers respondió ${response.status}.`);
    const payload = await response.json() as { workers?: Array<{ id?: unknown; status?: unknown }> };
    const workers = payload.workers ?? [];
    emit("scale-zero-poll", { workerCount: workers.length, statuses: workers.map((worker) => worker.status) });
    if (workers.length === 0) return true;
    await new Promise((resolve) => setTimeout(resolve, 30_000));
  }
  throw new Error("Vast no volvió a cero workers dentro del límite.");
}

async function main() {
  const config = requireSafeConfiguration();
  const userId = await findServiceAdminId();
  const userHash = createHash("sha256").update(userId).digest("hex").slice(0, 12);
  const balanceBefore = await vastBalance();
  emit("run-start", { runId: config.vastTest.runId, workflow: EXPECTED_WORKFLOW, userHash, balanceBefore, maxJobs: 5, budgetUsd: config.vastTest.budgetUsd });

  const evidence: Array<Record<string, unknown>> = [];
  for (const [index, testCase] of cases.entries()) {
    const request = {
      prompt: testCase.prompt,
      negativePrompt: "text, watermark, low quality",
      seed: testCase.seed,
      steps: 4,
      cfgScale: 1,
      width: 512,
      height: 512,
      aspectRatio: "1:1",
      resolution: "1k",
    };
    const route = resolveImageRoute("flux-schnell", request);
    if (route.workflowVersion !== EXPECTED_WORKFLOW) throw new Error("La ruta no resolvió Flux Schnell.");
    const queued = await enqueueGeneration({
      userId,
      kind: "image",
      queueKind: "image",
      route,
      request,
      idempotencyKey: `${config.vastTest.runId}:${index + 1}:${testCase.label}`,
      auditContext: { userAgent: "bellas-artes-vast-acceptance/1.0" },
    });
    if (!queued.jobId || queued.status !== "queued") throw new Error(`No se pudo encolar ${testCase.label}: ${queued.message}`);
    const admin = createAdminClient();
    const { data: existing, error: existingError } = await admin.from("generation_jobs").select("status").eq("id", queued.jobId).single();
    if (existingError) throw existingError;
    if (existing.status === "failed" || existing.status === "canceled") {
      const { error: retryError } = await admin.rpc("retry_generation_job", { p_job_id: queued.jobId });
      if (retryError) throw retryError;
      await enqueueGenerationJob({ kind: "image", jobId: queued.jobId });
      emit("job-retried", { label: testCase.label, jobId: queued.jobId, previousStatus: existing.status });
    }
    emit("job-enqueued", { label: testCase.label, jobId: queued.jobId, creditsReserved: queued.creditsReserved });
    const terminal = await waitForTerminal(queued.jobId);
    if (terminal.status !== "completed") throw new Error(`${testCase.label} terminó ${terminal.status}: ${terminal.error_code ?? terminal.error_message}`);
    if (terminal.billing_mode !== "shadow" || terminal.credits_reserved !== 0 || terminal.credits_captured !== 0 || terminal.credits_refunded !== 0) {
      throw new Error(`Descuadre financiero en ${testCase.label}.`);
    }
    const [asset, attempt] = await Promise.all([
      verifyPrivateAsset(userId, queued.jobId),
      waitForAttemptCost(queued.jobId),
    ]);
    const item = {
      label: testCase.label,
      jobId: queued.jobId,
      status: terminal.status,
      billingMode: terminal.billing_mode,
      creditsReserved: terminal.credits_reserved,
      creditsCaptured: terminal.credits_captured,
      creditsRefunded: terminal.credits_refunded,
      quotedCredits: terminal.quoted_credits,
      asset,
      attempt,
    };
    evidence.push(item);
    emit("job-verified", item);
  }

  await waitForScaleZero();
  const balanceAfter = await vastBalance();
  const spentUsd = Math.max(balanceBefore - balanceAfter, 0);
  if (spentUsd > config.vastTest.budgetUsd) throw new Error(`El gasto real US$${spentUsd.toFixed(6)} excedió el presupuesto.`);
  emit("run-complete", { runId: config.vastTest.runId, jobs: evidence.length, balanceBefore, balanceAfter, spentUsd, scaleZero: true });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    emit("run-failed", { error: error instanceof Error ? error.message : String(error) });
    process.exit(1);
  });
