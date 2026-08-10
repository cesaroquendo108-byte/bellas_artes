import { NextResponse } from "next/server"

import { getGenerationAuditContext } from "@/lib/generation/audit"
import { characterGenerationRequestSchema, normalizeCharacterGenerationRequest } from "@/lib/generation/character-world"
import { resolveCharacterRoute } from "@/lib/generation/registry"
import { enqueueGeneration, generationErrorResponse, requireGenerationUser } from "@/lib/generation/service"

export async function POST(request: Request) {
  let user
  try {
    user = await requireGenerationUser()
  } catch (error) {
    const result = generationErrorResponse(error)
    return NextResponse.json(result.body, { status: result.status })
  }

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ errorCode: "INVALID_JSON", message: "El cuerpo de la solicitud no es JSON válido." }, { status: 400 })

  const parsed = characterGenerationRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({
      errorCode: "INVALID_CHARACTER_GENERATION_REQUEST",
      message: "Revisa los campos de la solicitud.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    }, { status: 422 })
  }

  try {
    const generationRequest = normalizeCharacterGenerationRequest(parsed.data)
    const response = await enqueueGeneration({
      userId: user.id,
      kind: "character",
      queueKind: "character",
      route: resolveCharacterRoute(parsed.data.model, generationRequest),
      request: generationRequest,
      assetIds: parsed.data.referenceAssetIds,
      idempotencyKey: request.headers.get("idempotency-key") ?? undefined,
      auditContext: getGenerationAuditContext(request),
    })
    return NextResponse.json(response, { status: response.status === "not_configured" ? 503 : 202 })
  } catch (error) {
    const result = generationErrorResponse(error)
    return NextResponse.json(result.body, { status: result.status })
  }
}
