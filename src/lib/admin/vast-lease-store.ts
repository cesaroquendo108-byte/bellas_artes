import "server-only";

import type { VastAdminLease, VastLeaseState } from "@/lib/admin/vast-contracts";
import { createAdminClient } from "@/utils/supabase/admin";

type LeaseRow = {
  id: string;
  request_id: string;
  vast_instance_id: number | string | null;
  operator_id: string;
  offer_id: number | string;
  preset: "comfy-clean" | "flux-cached";
  market: "on-demand" | "bid";
  state: VastLeaseState;
  label: string;
  gpu_name: string | null;
  gpu_ram_mb: number | null;
  hourly_cost_usd: number | string;
  estimated_max_cost_usd: number | string;
  balance_before_usd: number | string;
  balance_after_usd: number | string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
  destroyed_at: string | null;
  error_code: string | null;
  error_message: string | null;
};

const leaseColumns = "id,request_id,vast_instance_id,operator_id,offer_id,preset,market,state,label,gpu_name,gpu_ram_mb,hourly_cost_usd,estimated_max_cost_usd,balance_before_usd,balance_after_usd,expires_at,created_at,updated_at,destroyed_at,error_code,error_message";

export async function listVastAdminLeases(limit = 30) {
  const { data, error } = await createAdminClient()
    .from("vast_admin_leases")
    .select(leaseColumns)
    .order("created_at", { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 100));
  if (error) throw new Error(`No se pudieron consultar los alquileres Vast: ${error.message}`);
  return (data as unknown as LeaseRow[]).map(mapLease);
}

export async function getVastLeaseById(id: string) {
  const { data, error } = await createAdminClient()
    .from("vast_admin_leases")
    .select(leaseColumns)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`No se pudo consultar el alquiler Vast: ${error.message}`);
  return data ? mapLease(data as unknown as LeaseRow) : null;
}

export async function getVastLeaseByRequestId(requestId: string) {
  const { data, error } = await createAdminClient()
    .from("vast_admin_leases")
    .select(leaseColumns)
    .eq("request_id", requestId)
    .maybeSingle();
  if (error) throw new Error(`No se pudo consultar la solicitud Vast: ${error.message}`);
  return data ? mapLease(data as unknown as LeaseRow) : null;
}

export async function getVastLeaseByInstanceId(instanceId: number) {
  const { data, error } = await createAdminClient()
    .from("vast_admin_leases")
    .select(leaseColumns)
    .eq("vast_instance_id", instanceId)
    .maybeSingle();
  if (error) throw new Error(`No se pudo consultar la instancia Vast administrada: ${error.message}`);
  return data ? mapLease(data as unknown as LeaseRow) : null;
}

export async function insertPendingVastLease(input: {
  id: string;
  requestId: string;
  operatorId: string;
  offerId: number;
  preset: "comfy-clean" | "flux-cached";
  market: "on-demand" | "bid";
  label: string;
  gpuName: string;
  gpuRamMb: number;
  hourlyCostUsd: number;
  estimatedMaxCostUsd: number;
  balanceBeforeUsd: number;
  expiresAt: string;
}) {
  const { data, error } = await createAdminClient()
    .from("vast_admin_leases")
    .insert({
      id: input.id,
      request_id: input.requestId,
      operator_id: input.operatorId,
      offer_id: input.offerId,
      preset: input.preset,
      market: input.market,
      state: "pending",
      label: input.label,
      gpu_name: input.gpuName,
      gpu_ram_mb: input.gpuRamMb,
      hourly_cost_usd: input.hourlyCostUsd,
      estimated_max_cost_usd: input.estimatedMaxCostUsd,
      balance_before_usd: input.balanceBeforeUsd,
      expires_at: input.expiresAt,
    })
    .select(leaseColumns)
    .single();
  if (error) {
    const wrapped = new Error(error.message) as Error & { code?: string };
    wrapped.code = error.code;
    throw wrapped;
  }
  return mapLease(data as unknown as LeaseRow);
}

export async function updateVastLease(id: string, values: {
  state?: VastLeaseState;
  vastInstanceId?: number | null;
  balanceAfterUsd?: number | null;
  lastSyncedAt?: string | null;
  destroyedAt?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
}) {
  const row: Record<string, unknown> = {};
  if (values.state !== undefined) row.state = values.state;
  if (values.vastInstanceId !== undefined) row.vast_instance_id = values.vastInstanceId;
  if (values.balanceAfterUsd !== undefined) row.balance_after_usd = values.balanceAfterUsd;
  if (values.lastSyncedAt !== undefined) row.last_synced_at = values.lastSyncedAt;
  if (values.destroyedAt !== undefined) row.destroyed_at = values.destroyedAt;
  if (values.errorCode !== undefined) row.error_code = values.errorCode;
  if (values.errorMessage !== undefined) row.error_message = values.errorMessage?.slice(0, 300) ?? null;
  const { data, error } = await createAdminClient()
    .from("vast_admin_leases")
    .update(row)
    .eq("id", id)
    .select(leaseColumns)
    .single();
  if (error) throw new Error(`No se pudo actualizar el alquiler Vast: ${error.message}`);
  return mapLease(data as unknown as LeaseRow);
}

export async function auditVastAdminAction(input: {
  actorId: string;
  action: string;
  leaseId: string;
  instanceId?: number | null;
  metadata?: Record<string, string | number | boolean | null>;
}) {
  const { error } = await createAdminClient().from("admin_audit_events").insert({
    actor_id: input.actorId,
    action: input.action.slice(0, 120),
    target_type: "vast_admin_lease",
    target_id: input.leaseId,
    metadata: {
      ...(input.metadata ?? {}),
      instanceId: input.instanceId ?? null,
    },
  });
  if (error) throw new Error(`No se pudo auditar la operación Vast: ${error.message}`);
}

export async function getVastLifecycleHeartbeat() {
  const { data, error } = await createAdminClient()
    .from("service_heartbeats")
    .select("reported_status,details,observed_at")
    .eq("service_key", "worker:vast-admin-lifecycle")
    .maybeSingle();
  if (error) throw new Error(`No se pudo consultar el heartbeat Vast: ${error.message}`);
  return {
    reportedStatus: typeof data?.reported_status === "string" ? data.reported_status : null,
    observedAt: typeof data?.observed_at === "string" ? data.observed_at : null,
    details: data?.details && typeof data.details === "object" ? data.details as Record<string, unknown> : {},
  };
}

function mapLease(row: LeaseRow): VastAdminLease & { operatorId: string } {
  return {
    operatorId: row.operator_id,
    id: row.id,
    requestId: row.request_id,
    vastInstanceId: nullableNumber(row.vast_instance_id),
    preset: row.preset,
    market: row.market,
    state: row.state,
    label: row.label,
    gpuName: row.gpu_name,
    gpuRamMb: row.gpu_ram_mb,
    hourlyCostUsd: Number(row.hourly_cost_usd),
    estimatedMaxCostUsd: Number(row.estimated_max_cost_usd),
    balanceBeforeUsd: Number(row.balance_before_usd),
    balanceAfterUsd: nullableNumber(row.balance_after_usd),
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    destroyedAt: row.destroyed_at,
    errorCode: row.error_code,
    errorMessage: row.error_message,
  };
}

function nullableNumber(value: number | string | null) {
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
