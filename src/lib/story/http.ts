import { NextResponse } from "next/server"
import { ZodError } from "zod"

import { StoryProjectError } from "./errors"

export function storyErrorResponse(error: unknown) {
  if (error instanceof ZodError) return NextResponse.json({ errorCode: "INVALID_STORY_PROJECT_REQUEST", message: "Revisa los campos de la solicitud.", fieldErrors: error.flatten().fieldErrors }, { status: 422 })
  if (error instanceof StoryProjectError) {
    const status = error.code === "NOT_FOUND" ? 404 : error.code === "DATABASE_ERROR" ? 503 : 422
    return NextResponse.json({ errorCode: error.code, message: error.message }, { status })
  }
  return NextResponse.json({ errorCode: "STORY_PROJECT_ERROR", message: "No se pudo completar la operación." }, { status: 500 })
}

export async function readJson(request: Request) {
  try { return { ok: true as const, body: await request.json() } }
  catch { return { ok: false as const, response: NextResponse.json({ errorCode: "INVALID_JSON", message: "El cuerpo de la solicitud no es JSON válido." }, { status: 400 }) } }
}
