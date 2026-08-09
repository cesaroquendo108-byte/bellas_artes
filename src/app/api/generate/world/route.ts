import { NextResponse } from "next/server"

import { worldGenerationRequestSchema } from "@/lib/generation/character-world"
import { resolveWorldRoute } from "@/lib/generation/registry"
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

  const parsed = worldGenerationRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({
      errorCode: "INVALID_WORLD_GENERATION_REQUEST",
      message: "Revisa los campos de la solicitud.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    }, { status: 422 })
  }

  try {
    const response = await enqueueGeneration({
      userId: user.id,
      kind: "world",
      queueKind: "world",
      route: resolveWorldRoute(parsed.data.model),
      request: parsed.data,
      assetIds: parsed.data.referenceAssetIds,
      idempotencyKey: request.headers.get("idempotency-key") ?? undefined,
    })
    return NextResponse.json(response, { status: response.status === "not_configured" ? 503 : 202 })
  } catch (error) {
    const result = generationErrorResponse(error)
    return NextResponse.json(result.body, { status: result.status })
  }
}
