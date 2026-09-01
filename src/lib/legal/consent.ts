import "server-only";

import { createHash } from "node:crypto";
import { createAdminClient } from "@/utils/supabase/admin";

export const CURRENT_TERMS_VERSION = "2026-09-01";
export const CURRENT_MODERATION_VERSION = "2026-09-01";

export type ConsentType = "terms" | "moderation";

export class LegalConsentError extends Error {
  constructor(
    readonly code: "LEGAL_CONSENT_REQUIRED" | "LEGAL_CONSENT_UNAVAILABLE",
    message: string,
    readonly status: 403 | 503,
  ) {
    super(message);
  }
}

export interface LegalConsentStatus {
  terms: boolean;
  moderation: boolean;
  complete: boolean;
}

const requiredVersions: Record<ConsentType, string> = {
  terms: CURRENT_TERMS_VERSION,
  moderation: CURRENT_MODERATION_VERSION,
};

export async function getLegalConsentStatus(userId: string): Promise<LegalConsentStatus> {
  const { data, error } = await createAdminClient()
    .from("user_consents")
    .select("consent_type,version")
    .eq("user_id", userId)
    .in("consent_type", Object.keys(requiredVersions));

  if (error) {
    throw new LegalConsentError(
      "LEGAL_CONSENT_UNAVAILABLE",
      "El registro legal todavía no está disponible en este entorno.",
      503,
    );
  }

  const rows = (data ?? []) as Array<{ consent_type?: unknown; version?: unknown }>;
  const terms = rows.some((row) => row.consent_type === "terms" && row.version === CURRENT_TERMS_VERSION);
  const moderation = rows.some((row) => row.consent_type === "moderation" && row.version === CURRENT_MODERATION_VERSION);
  return { terms, moderation, complete: terms && moderation };
}

export async function assertLegalConsent(userId: string) {
  const status = await getLegalConsentStatus(userId);
  if (!status.complete) {
    throw new LegalConsentError(
      "LEGAL_CONSENT_REQUIRED",
      "Acepta los términos de uso y las reglas de moderación antes de continuar.",
      403,
    );
  }
  return status;
}

export async function recordLegalConsent(input: {
  userId: string;
  ipAddress?: string;
  userAgent?: string;
  source?: string;
}) {
  const ipHash = hashOptional(input.ipAddress);
  const rows = (Object.entries(requiredVersions) as Array<[ConsentType, string]>).map(([consentType, version]) => ({
    user_id: input.userId,
    consent_type: consentType,
    version,
    accepted_at: new Date().toISOString(),
    ip_hash: ipHash,
    user_agent: input.userAgent?.slice(0, 512) ?? null,
    metadata: { source: input.source ?? "legal-consent" },
  }));

  const { error } = await createAdminClient()
    .from("user_consents")
    .upsert(rows, { onConflict: "user_id,consent_type,version", ignoreDuplicates: true });
  if (error) {
    throw new LegalConsentError(
      "LEGAL_CONSENT_UNAVAILABLE",
      "No se pudo registrar la aceptación legal.",
      503,
    );
  }
}

function hashOptional(value?: string) {
  const salt = process.env.MODERATION_AUDIT_SALT?.trim();
  if (!value || !salt) return null;
  return createHash("sha256").update(`${salt}:${value}`).digest("hex");
}
