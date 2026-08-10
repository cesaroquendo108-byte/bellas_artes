import { NextResponse } from "next/server";
import { z } from "zod";
import { getGenerationAuditContext } from "@/lib/generation/audit";
import { resolveLivePortraitRoute } from "@/lib/generation/registry";
import { enqueueGeneration, generationErrorResponse, requireGenerationUser } from "@/lib/generation/service";

const requestSchema = z.object({
  portraitAssetId: z.string().uuid(),
  drivingAssetId: z.string().uuid(),
  seed: z.number().int().min(0).max(2_147_483_647).optional(),
}).strict();

export async function POST(request: Request) {
  let user;
  try {
    user = await requireGenerationUser();
  } catch (error) {
    const result = generationErrorResponse(error);
    return NextResponse.json(result.body, { status: result.status });
  }

  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errorCode: "INVALID_LIVEPORTRAIT_REQUEST", message: "Selecciona un retrato y un video conductor válidos." }, { status: 422 });
  }

  try {
    const sourceAssetIds = [parsed.data.portraitAssetId, parsed.data.drivingAssetId];
    const response = await enqueueGeneration({
      userId: user.id,
      kind: "character",
      queueKind: "character",
      route: resolveLivePortraitRoute(parsed.data),
      request: { operation: "liveportrait", sourceAssetIds, seed: parsed.data.seed },
      assetIds: sourceAssetIds,
      idempotencyKey: request.headers.get("idempotency-key") ?? undefined,
      auditContext: getGenerationAuditContext(request),
    });
    return NextResponse.json(response, { status: response.status === "not_configured" ? 503 : 202 });
  } catch (error) {
    const result = generationErrorResponse(error);
    return NextResponse.json(result.body, { status: result.status });
  }
}
