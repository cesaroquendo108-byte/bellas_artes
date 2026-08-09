import { NextResponse } from "next/server"
import { ZodError } from "zod"

export class PhaseSevenError extends Error {
  constructor(public code: "NOT_FOUND" | "FORBIDDEN" | "INVALID_ASSET" | "LIMIT_EXCEEDED" | "DATABASE_ERROR", message: string) { super(message) }
}

export function phaseSevenErrorResponse(error: unknown) {
  if (error instanceof ZodError) return NextResponse.json({ errorCode: "INVALID_REQUEST", message: "Revisa los campos enviados.", fieldErrors: error.flatten().fieldErrors }, { status: 422 })
  if (error instanceof PhaseSevenError) {
    const status = error.code === "NOT_FOUND" ? 404 : error.code === "FORBIDDEN" ? 403 : error.code === "DATABASE_ERROR" ? 503 : 422
    return NextResponse.json({ errorCode: error.code, message: error.message }, { status })
  }
  return NextResponse.json({ errorCode: "PHASE_SEVEN_ERROR", message: "No se pudo completar la operación." }, { status: 500 })
}

export async function readJson(request: Request) {
  try { return { ok: true as const, body: await request.json() } }
  catch { return { ok: false as const, response: NextResponse.json({ errorCode: "INVALID_JSON", message: "El cuerpo no contiene JSON válido." }, { status: 400 }) } }
}
