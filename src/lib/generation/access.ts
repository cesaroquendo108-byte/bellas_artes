import { createAdminClient } from "@/utils/supabase/admin";
import { getGenerationConfig, type GenerationAccessMode, type GenerationProviderKind } from "./config";

type AccessLevel = "beta" | "pro" | "b2b" | "service";

export interface GenerationAccessProfile {
  role?: string | null;
  plan_tier?: string | null;
}

export interface GenerationAccessGrant {
  access_level?: AccessLevel | null;
  allowed_kinds?: string[] | null;
  enabled?: boolean | null;
  expires_at?: string | null;
}

export type GenerationAccessDecision =
  | { allowed: true }
  | { allowed: false; code: string; message: string; status: 403 | 503 };

export function evaluateGenerationAccess(input: {
  mode: GenerationAccessMode;
  kind: GenerationProviderKind;
  backendModel: string;
  profile: GenerationAccessProfile | null;
  grant: GenerationAccessGrant | null;
  now?: Date;
}): GenerationAccessDecision {
  if (!input.profile) return unavailable();
  const grant = activeGrant(input.grant, input.now ?? new Date());
  if (input.mode === "allowlist" && (!grant || !grantAllowsKind(grant, input.kind))) {
    return { allowed: false, code: "GENERATION_BETA_INVITE_REQUIRED", message: "Esta cuenta todavía no tiene acceso a la beta privada.", status: 403 };
  }
  if (input.profile.role === "admin") return { allowed: true };
  if (input.mode === "admin") {
    return { allowed: false, code: "GENERATION_ADMIN_ONLY", message: "La generación está limitada temporalmente a administradores.", status: 403 };
  }
  if (isPremiumBackend(input.backendModel) && !hasPremiumEntitlement(input.profile, grant)) {
    return { allowed: false, code: "GENERATION_PREMIUM_REQUIRED", message: "Este modelo requiere un entitlement Pro o B2B.", status: 403 };
  }
  return { allowed: true };
}

export async function assertGenerationAccess(
  userId: string,
  kind: GenerationProviderKind,
  backendModel: string,
): Promise<GenerationAccessDecision> {
  const admin = createAdminClient();
  const { data: profile, error: profileError } = await admin
    .from("users")
    .select("role,plan_tier")
    .eq("id", userId)
    .maybeSingle();
  if (profileError) return unavailable();

  const config = getGenerationConfig();
  let grant: GenerationAccessGrant | null = null;
  if (config.accessMode === "allowlist" || isPremiumBackend(backendModel)) {
    const { data, error } = await admin
      .from("generation_access_grants")
      .select("access_level,allowed_kinds,enabled,expires_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) return unavailable();
    grant = data as GenerationAccessGrant | null;
  }

  return evaluateGenerationAccess({
    mode: config.accessMode,
    kind,
    backendModel,
    profile: profile as GenerationAccessProfile | null,
    grant,
  });
}

function activeGrant(grant: GenerationAccessGrant | null, now: Date) {
  if (!grant?.enabled) return null;
  if (grant.expires_at && Date.parse(grant.expires_at) <= now.getTime()) return null;
  return grant;
}

function grantAllowsKind(grant: GenerationAccessGrant, kind: GenerationProviderKind) {
  return !grant.allowed_kinds?.length || grant.allowed_kinds.includes(kind);
}

function isPremiumBackend(backendModel: string) {
  return backendModel.includes("flux-dev") || backendModel.includes("hunyuan-video-13b");
}

function hasPremiumEntitlement(profile: GenerationAccessProfile, grant: GenerationAccessGrant | null) {
  return profile.plan_tier === "pro"
    || profile.plan_tier === "b2b"
    || grant?.access_level === "pro"
    || grant?.access_level === "b2b"
    || grant?.access_level === "service";
}

function unavailable(): GenerationAccessDecision {
  return { allowed: false, code: "GENERATION_ACCESS_UNAVAILABLE", message: "No se pudo comprobar el acceso de generación.", status: 503 };
}
