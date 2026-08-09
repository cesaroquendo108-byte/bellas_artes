import { NextResponse } from "next/server"
import { z } from "zod"
import { addBrandKitAsset, getBrandKitSession } from "@/lib/brand-kits/queries"
import { phaseSevenErrorResponse, PhaseSevenError } from "@/lib/phase7/http"

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { supabase, user } = await getBrandKitSession(); if (!user) return NextResponse.json({ errorCode: "UNAUTHORIZED", message: "No autorizado." }, { status: 401 })
    const form = await request.formData(); const file = form.get("file"); const rawKind = form.get("kind"); if (rawKind !== "logo" && rawKind !== "reference") throw new PhaseSevenError("INVALID_ASSET", "El tipo de recurso no es válido."); const kind = rawKind
    if (!(file instanceof File)) throw new PhaseSevenError("INVALID_ASSET", "Selecciona un archivo de marca.")
    const id = z.string().uuid().parse((await context.params).id)
    return NextResponse.json({ kit: await addBrandKitAsset(supabase, user.id, id, file, kind) }, { status: 201 })
  } catch (error) { return phaseSevenErrorResponse(error) }
}
