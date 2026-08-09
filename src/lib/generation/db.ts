import { createAdminClient } from "@/utils/supabase/admin";
import type { GenerationKind } from "./contracts";
import type { GenerationRouteSpec } from "./registry";

export interface GenerationJobRecord {
  id: string;
  user_id: string;
  kind: GenerationKind;
  operation: string | null;
  public_model: string;
  backend_model: string;
  provider_route: string;
  workflow_version: string;
  status: "queued" | "processing" | "completed" | "failed" | "canceled";
  request: Record<string, unknown>;
  provider_job_id: string | null;
  attempts: number;
  max_attempts: number;
  credits_reserved: number;
  credits_captured: number;
  credits_refunded: number;
  output_asset_ids?: string[];
  error_code: string | null;
  error_message: string | null;
  cancel_requested: boolean;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string;
}

function rpcError(error: { message?: string } | null) {
  return new Error(error?.message ?? "No se pudo guardar el job de generación.");
}

export async function reserveGenerationJob(input: {
  userId: string;
  idempotencyKey: string;
  kind: GenerationKind;
  route: GenerationRouteSpec;
  request: Record<string, unknown>;
  maxAttempts: number;
}) {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("reserve_generation_credits", {
    p_user_id: input.userId,
    p_idempotency_key: input.idempotencyKey,
    p_kind: input.kind,
    p_operation: input.route.operation ?? null,
    p_public_model: input.route.publicModel,
    p_backend_model: input.route.backendModel,
    p_provider_route: input.route.providerRoute,
    p_workflow_version: input.route.workflowVersion,
    p_credits: input.route.credits,
    p_request: input.request,
    p_max_attempts: input.maxAttempts,
  });
  if (error) throw rpcError(error);
  return data as { job_id: string; status: string; reserved_credits: number; idempotent?: boolean };
}

export async function refundGenerationJob(input: { jobId: string; code: string; message: string; canceled?: boolean }) {
  const { data, error } = await createAdminClient().rpc("refund_generation_credits", {
    p_job_id: input.jobId,
    p_error_code: input.code,
    p_error_message: input.message,
    p_canceled: input.canceled ?? false,
  });
  if (error) throw rpcError(error);
  return data;
}

export async function getOwnedGenerationJob(userId: string, jobId: string) {
  const { data, error } = await createAdminClient()
    .from("generation_jobs")
    .select("*")
    .eq("id", jobId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw rpcError(error);
  return data as GenerationJobRecord | null;
}

export async function getGenerationJob(jobId: string) {
  const { data, error } = await createAdminClient().from("generation_jobs").select("*").eq("id", jobId).maybeSingle();
  if (error) throw rpcError(error);
  return data as GenerationJobRecord | null;
}

export async function verifyOwnedAssets(userId: string, assetIds: string[]) {
  const ids = [...new Set(assetIds.filter(Boolean))];
  if (!ids.length) return [];
  const { data, error } = await createAdminClient().from("assets").select("id,r2_key,user_id,type,mime_type,name,bytes,metadata").eq("user_id", userId).in("id", ids);
  if (error) throw rpcError(error);
  if ((data?.length ?? 0) !== ids.length) throw Object.assign(new Error("Uno de los assets no pertenece al usuario."), { code: "ASSET_NOT_OWNED" });
  return data ?? [];
}

export async function linkGenerationAssets(input: { jobId: string; assetIds: string[]; role: "input" | "reference" }) {
  if (!input.assetIds.length) return;
  const rows = [...new Set(input.assetIds)].map((assetId) => ({ job_id: input.jobId, asset_id: assetId, role: input.role }));
  const { error } = await createAdminClient().from("generation_job_assets").upsert(rows, { onConflict: "job_id,asset_id,role" });
  if (error) throw rpcError(error);
}

export async function getGenerationOutputAssetIds(jobId: string) {
  const { data, error } = await createAdminClient().from("generation_job_assets").select("asset_id").eq("job_id", jobId).eq("role", "output");
  if (error) throw rpcError(error);
  return (data ?? []).map((row) => row.asset_id as string);
}

export async function markGenerationProcessing(input: { jobId: string; providerJobId: string; providerRoute: string; attempt: number }) {
  const { data, error } = await createAdminClient().rpc("mark_generation_job_processing", {
    p_job_id: input.jobId,
    p_provider_job_id: input.providerJobId,
    p_provider_route: input.providerRoute,
    p_attempt: input.attempt,
  });
  if (error) throw rpcError(error);
  return data;
}

export async function completeGenerationJob(jobId: string, outputAssetIds: string[]) {
  const { data, error } = await createAdminClient().rpc("complete_generation_job", { p_job_id: jobId, p_output_asset_ids: outputAssetIds });
  if (error) throw rpcError(error);
  return data;
}

export async function recordGenerationFailure(input: { jobId: string; code: string; message: string; retryable: boolean }) {
  const { data, error } = await createAdminClient().rpc("record_generation_failure", {
    p_job_id: input.jobId,
    p_error_code: input.code,
    p_error_message: input.message,
    p_retryable: input.retryable,
  });
  if (error) throw rpcError(error);
  return data;
}

export async function requestGenerationCancellation(jobId: string) {
  const { data, error } = await createAdminClient().rpc("request_generation_cancellation", { p_job_id: jobId });
  if (error) throw rpcError(error);
  return data;
}
