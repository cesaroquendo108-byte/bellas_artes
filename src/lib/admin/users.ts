import "server-only";

import { maskAdminUserLabel } from "@/lib/admin/contracts";
import type {
  AdminGenerationGrant,
  AdminUserAuditEvent,
  AdminUserDetail,
  AdminUserListInput,
  AdminUserListItem,
  AdminUserRecentJob,
  AdminUsersPage,
  UpdateAdminUserAccessInput,
  UpdateAdminUserRoleInput,
} from "@/lib/admin/user-contracts";
import type { GenerationQueueKind } from "@/lib/generation/queue-contracts";
import { createAdminClient } from "@/utils/supabase/admin";

type SearchPayload = { total?: unknown; users?: unknown };
type RawUser = Record<string, unknown>;

export class AdminUserNotFoundError extends Error {
  constructor() {
    super("El usuario no existe.");
    this.name = "AdminUserNotFoundError";
  }
}

export async function listAdminUsers(input: AdminUserListInput): Promise<AdminUsersPage> {
  const offset = (input.page - 1) * input.pageSize;
  const { data, error } = await createAdminClient().rpc("search_admin_users", {
    p_search: input.search,
    p_role: input.role,
    p_plan: input.plan,
    p_access: input.access,
    p_offset: offset,
    p_limit: input.pageSize,
  });
  if (error) throw new Error(`No se pudieron consultar los usuarios: ${error.message}`);

  const payload = (data ?? {}) as SearchPayload;
  const total = toNumber(payload.total);
  const rows = Array.isArray(payload.users) ? payload.users as RawUser[] : [];
  return {
    users: rows.map(mapUser),
    total,
    page: input.page,
    pageSize: input.pageSize,
    pageCount: Math.max(Math.ceil(total / input.pageSize), 1),
  };
}

export async function getAdminUserDetail(userId: string): Promise<AdminUserDetail> {
  const admin = createAdminClient();
  const [userResult, grantResult, jobsResult, auditResult] = await Promise.all([
    admin.from("users")
      .select("id,email,display_name,role,plan_tier,created_at")
      .eq("id", userId)
      .maybeSingle(),
    admin.from("generation_access_grants")
      .select("access_level,allowed_kinds,enabled,expires_at")
      .eq("user_id", userId)
      .maybeSingle(),
    admin.from("generation_jobs")
      .select("id,kind,workflow_version,status,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5),
    admin.from("admin_audit_events")
      .select("id,actor_id,action,metadata,created_at")
      .eq("target_type", "user")
      .eq("target_id", userId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (userResult.error) throw new Error(`No se pudo consultar el usuario: ${userResult.error.message}`);
  if (!userResult.data) throw new AdminUserNotFoundError();
  if (grantResult.error) throw new Error(`No se pudo consultar el acceso: ${grantResult.error.message}`);
  if (jobsResult.error) throw new Error(`No se pudieron consultar los jobs: ${jobsResult.error.message}`);
  if (auditResult.error) throw new Error(`No se pudo consultar la auditoría: ${auditResult.error.message}`);

  const actorIds = [...new Set((auditResult.data ?? []).map((event) => String(event.actor_id)))];
  const actorsResult = actorIds.length
    ? await admin.from("users").select("id,email").in("id", actorIds)
    : { data: [], error: null };
  if (actorsResult.error) throw new Error(`No se pudieron resolver los actores: ${actorsResult.error.message}`);
  const actors = new Map((actorsResult.data ?? []).map((actor) => [String(actor.id), String(actor.email ?? "")]));

  const base = mapUser({
    ...userResult.data,
    access_level: grantResult.data?.access_level,
    allowed_kinds: grantResult.data?.allowed_kinds,
    grant_enabled: grantResult.data?.enabled,
    expires_at: grantResult.data?.expires_at,
    grant_active: isGrantActive(grantResult.data?.enabled, grantResult.data?.expires_at),
  });

  return {
    ...base,
    recentJobs: (jobsResult.data ?? []).map((job): AdminUserRecentJob => ({
      id: String(job.id),
      kind: job.kind as GenerationQueueKind,
      workflowVersion: String(job.workflow_version),
      status: job.status as AdminUserRecentJob["status"],
      createdAt: String(job.created_at),
    })),
    auditEvents: (auditResult.data ?? []).map((event): AdminUserAuditEvent => ({
      id: String(event.id),
      actorLabel: maskAdminUserLabel(actors.get(String(event.actor_id)), String(event.actor_id)),
      action: String(event.action),
      metadata: sanitizeAdminAuditMetadata(event.metadata),
      createdAt: String(event.created_at),
    })),
  };
}

export async function updateAdminUserAccess(actorId: string, userId: string, input: UpdateAdminUserAccessInput) {
  const { data, error } = await createAdminClient().rpc("set_generation_access_grant", {
    p_actor: actorId,
    p_user: userId,
    p_access_level: input.accessLevel,
    p_allowed_kinds: input.allowedKinds,
    p_enabled: input.enabled,
    p_expires_at: input.expiresAt,
    p_reason: input.reason,
  });
  if (error) throw new Error(`No se pudo actualizar el acceso: ${error.message}`);
  return data;
}

export async function updateAdminUserRole(actorId: string, userId: string, input: UpdateAdminUserRoleInput) {
  const { data, error } = await createAdminClient().rpc("set_admin_user_role", {
    p_actor: actorId,
    p_user: userId,
    p_role: input.role,
    p_confirmation: input.confirmation,
    p_reason: input.reason,
  });
  if (error) throw new Error(`No se pudo actualizar el rol: ${error.message}`);
  return data;
}

function mapUser(row: RawUser): AdminUserListItem {
  const grant = row.access_level ? {
    accessLevel: String(row.access_level) as AdminGenerationGrant["accessLevel"],
    allowedKinds: Array.isArray(row.allowed_kinds) ? row.allowed_kinds as GenerationQueueKind[] : [],
    enabled: Boolean(row.grant_enabled),
    active: Boolean(row.grant_active),
    expiresAt: typeof row.expires_at === "string" ? row.expires_at : null,
  } : null;
  return {
    id: String(row.id),
    email: String(row.email ?? ""),
    displayName: typeof row.display_name === "string" && row.display_name.trim() ? row.display_name : null,
    role: row.role === "admin" ? "admin" : "user",
    planTier: row.plan_tier === "pro" || row.plan_tier === "b2b" ? row.plan_tier : "free",
    createdAt: String(row.created_at),
    grant,
  };
}

function isGrantActive(enabled: unknown, expiresAt: unknown) {
  if (enabled !== true) return false;
  if (typeof expiresAt !== "string") return true;
  return Date.parse(expiresAt) > Date.now();
}

export function sanitizeAdminAuditMetadata(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const source = value as Record<string, unknown>;
  const allowed = ["previousRole", "role", "accessLevel", "allowedKinds", "enabled", "expiresAt", "reason"];
  return Object.fromEntries(allowed.filter((key) => key in source).map((key) => [key, source[key]]));
}

function toNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : 0;
}
