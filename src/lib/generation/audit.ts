import { createHash } from "node:crypto";
import { createAdminClient } from "@/utils/supabase/admin";

function digest(value: string) {
  const salt = process.env.MODERATION_AUDIT_SALT?.trim();
  if (!salt) return null;
  return createHash("sha256").update(`${salt}:${value}`).digest("hex");
}

export async function recordModerationEvent(input: {
  userId: string;
  prompt: string;
  decision: "allowed" | "blocked";
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  if (process.env.GENERATION_AUDIT_ENABLED !== "true") return;
  const promptHash = digest(input.prompt);
  if (!promptHash) {
    if (process.env.GENERATION_REQUIRE_AUDIT === "true") {
      throw new Error("MODERATION_AUDIT_NOT_CONFIGURED");
    }
    return;
  }
  const ipHash = input.ipAddress ? digest(input.ipAddress) : null;
  const { error } = await createAdminClient().from("generation_moderation_events").insert({
    user_id: input.userId,
    prompt_hash: promptHash,
    ip_hash: ipHash,
    decision: input.decision,
    reason: input.reason ?? null,
    user_agent: input.userAgent?.slice(0, 512) ?? null,
  });
  if (error && process.env.GENERATION_REQUIRE_AUDIT === "true") throw error;
}

export function getGenerationAuditContext(request: Request) {
  return {
    ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip") ?? undefined,
    userAgent: request.headers.get("user-agent") ?? undefined,
  };
}
