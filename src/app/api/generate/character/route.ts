import { NextResponse } from "next/server"

import { characterGenerationRequestSchema, type CharacterWorldJobResponse } from "@/lib/generation/character-world"
import { createClient } from "@/utils/supabase/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ errorCode: "UNAUTHORIZED", message: "No autorizado." }, { status: 401 })

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

  const response: CharacterWorldJobResponse = {
    jobId: null,
    kind: "character",
    status: "not_configured",
    creditsReserved: 0,
    errorCode: "CHARACTER_PROVIDER_NOT_CONFIGURED",
    message: "La generación de personajes todavía no está conectada.",
  }
  return NextResponse.json(response, { status: 503 })
}
