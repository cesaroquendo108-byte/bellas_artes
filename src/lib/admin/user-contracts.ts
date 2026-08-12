import type { GenerationQueueKind } from "@/lib/generation/queue-contracts";

export const adminUserRoles = ["user", "admin"] as const;
export type AdminUserRole = (typeof adminUserRoles)[number];

export const adminPlanTiers = ["free", "pro", "b2b"] as const;
export type AdminPlanTier = (typeof adminPlanTiers)[number];

export const generationAccessLevels = ["beta", "pro", "b2b", "service"] as const;
export type GenerationAccessLevel = (typeof generationAccessLevels)[number];

export const adminAccessFilters = ["all", "active", "inactive", "none"] as const;
export type AdminAccessFilter = (typeof adminAccessFilters)[number];

export type AdminGenerationGrant = {
  accessLevel: GenerationAccessLevel;
  allowedKinds: GenerationQueueKind[];
  enabled: boolean;
  active: boolean;
  expiresAt: string | null;
};

export type AdminUserListItem = {
  id: string;
  email: string;
  displayName: string | null;
  role: AdminUserRole;
  planTier: AdminPlanTier;
  createdAt: string;
  grant: AdminGenerationGrant | null;
};

export type AdminUsersPage = {
  users: AdminUserListItem[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

export type AdminUserRecentJob = {
  id: string;
  kind: GenerationQueueKind;
  workflowVersion: string;
  status: "queued" | "processing" | "completed" | "failed" | "canceled";
  createdAt: string;
};

export type AdminUserAuditEvent = {
  id: string;
  actorLabel: string;
  action: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type AdminUserDetail = AdminUserListItem & {
  recentJobs: AdminUserRecentJob[];
  auditEvents: AdminUserAuditEvent[];
};

export type AdminUserListInput = {
  search: string;
  role: AdminUserRole | "all";
  plan: AdminPlanTier | "all";
  access: AdminAccessFilter;
  page: number;
  pageSize: number;
};

export type UpdateAdminUserAccessInput = {
  accessLevel: GenerationAccessLevel;
  allowedKinds: GenerationQueueKind[];
  enabled: boolean;
  expiresAt: string | null;
  reason: string;
};

export type UpdateAdminUserRoleInput = {
  role: AdminUserRole;
  confirmation: "CAMBIAR ROL";
  reason: string;
};
