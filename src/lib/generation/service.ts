import { randomUUID } from "node:crypto";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { enqueueGenerationJob, type GenerationQueueKind } from "./queue";
import { getGenerationConfig, isGenerationRouteConfigured } from "./config";
import { moderateGenerationInput } from "./moderation";
import { recordModerationEvent } from "./audit";
import { consumeGenerationRateLimit, GenerationRateLimitError } from "./rate-limit";
import { linkGenerationAssets, reserveGenerationJob, refundGenerationJob, verifyOwnedAssets } from "./db";
import type { GenerationKind, GenerationJobResponse } from "./contracts";
import type { GenerationRouteSpec } from "./registry";

export class GenerationServiceError extends Error {
  constructor(readonly code: string, message: string, readonly status = 422) {
    super(message);
  }
}

export async function requireGenerationUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new GenerationServiceError("UNAUTHORIZED", "No autorizado.", 401);
  return user;
}

async function assertGenerationAccess(userId: string) {
  if (!getGenerationConfig().adminOnly) return;
  const { data, error } = await createAdminClient()
    .from("users")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new GenerationServiceError("GENERATION_ACCESS_UNAVAILABLE", "No se pudo comprobar el acceso de generación.", 503);
  if (data?.role !== "admin") throw new GenerationServiceError("GENERATION_ADMIN_ONLY", "La generación está limitada temporalmente a administradores.", 403);
}

export async function enqueueGeneration(input: {
  userId: string;
  kind: GenerationKind;
  queueKind: GenerationQueueKind;
  route: GenerationRouteSpec;
  request: Record<string, unknown>;
  assetIds?: string[];
  idempotencyKey?: string;
  priority?: number;
  auditContext?: { ipAddress?: string; userAgent?: string };
}): Promise<GenerationJobResponse> {
  const moderation = moderateGenerationInput({ prompt: String(input.request.prompt ?? ""), negativePrompt: String(input.request.negativePrompt ?? "") });
  await recordModerationEvent({
    userId: input.userId,
    prompt: String(input.request.prompt ?? ""),
    decision: moderation.allowed ? "allowed" : "blocked",
    reason: moderation.reason,
    ...input.auditContext,
  });
  if (!moderation.allowed) throw new GenerationServiceError(moderation.code ?? "PROMPT_BLOCKED", moderation.reason ?? "Solicitud bloqueada.", 422);

  try {
    await assertGenerationAccess(input.userId);
    await consumeGenerationRateLimit({ userId: input.userId, kind: input.kind });
    await verifyOwnedAssets(input.userId, input.assetIds ?? []);
    if (!isGenerationRouteConfigured(input.route)) {
      return {
        jobId: null,
        kind: input.kind,
        operation: input.route.operation as GenerationJobResponse["operation"],
        status: "not_configured",
        creditsReserved: 0,
        errorCode: `${input.kind.toUpperCase()}_PROVIDER_NOT_CONFIGURED`,
        message: `La generación de ${input.kind} todavía no está conectada.`,
      };
    }
    const result = await reserveGenerationJob({
      userId: input.userId,
      idempotencyKey: input.idempotencyKey ?? randomUUID(),
      kind: input.kind,
      route: input.route,
      request: input.request,
      maxAttempts: getGenerationConfig().maxAttempts,
    });
    const jobId = String(result.job_id);
    if (!result.idempotent) {
      try {
        const sourceIds = input.request.sourceAssetIds;
        const referenceIds = input.request.referenceAssetIds;
        if (Array.isArray(sourceIds)) await linkGenerationAssets({ jobId, assetIds: sourceIds.filter((value): value is string => typeof value === "string"), role: "input" });
        if (Array.isArray(referenceIds)) await linkGenerationAssets({ jobId, assetIds: referenceIds.filter((value): value is string => typeof value === "string"), role: "reference" });
        await enqueueGenerationJob({ kind: input.queueKind, jobId, priority: input.priority });
      } catch (error) {
        await refundGenerationJob({ jobId, code: "QUEUE_UNAVAILABLE", message: error instanceof Error ? error.message : "No se pudo encolar el job." });
        throw new GenerationServiceError("QUEUE_UNAVAILABLE", "La cola de generación no está disponible.", 503);
      }
    }
    return {
      jobId,
      kind: input.kind,
      operation: input.route.operation as GenerationJobResponse["operation"],
      status: "queued",
      creditsReserved: Number(result.reserved_credits ?? 0),
      message: "La generación fue encolada.",
    };
  } catch (error) {
    if (error instanceof GenerationServiceError) throw error;
    if (error instanceof GenerationRateLimitError) throw new GenerationServiceError(error.code, error.message, error.status);
    if (error && typeof error === "object" && "code" in error && error.code === "ASSET_NOT_OWNED") {
      throw new GenerationServiceError("ASSET_NOT_OWNED", "Uno de los assets no pertenece al usuario.", 403);
    }
    if (error instanceof Error && error.message.includes("Créditos insuficientes")) {
      throw new GenerationServiceError("INSUFFICIENT_CREDITS", "No tienes créditos suficientes.", 402);
    }
    throw new GenerationServiceError("GENERATION_UNAVAILABLE", "No se pudo crear el job de generación.", 503);
  }
}

export function generationErrorResponse(error: unknown) {
  if (error instanceof GenerationServiceError) return { body: { errorCode: error.code, message: error.message }, status: error.status };
  return { body: { errorCode: "GENERATION_UNAVAILABLE", message: "No se pudo iniciar la generación." }, status: 503 };
}
