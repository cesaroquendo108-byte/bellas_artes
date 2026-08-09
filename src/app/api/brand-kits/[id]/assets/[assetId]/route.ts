import { NextResponse } from "next/server"
import { z } from "zod"
import { getBrandKitSession, removeBrandKitAsset } from "@/lib/brand-kits/queries"
import { phaseSevenErrorResponse } from "@/lib/phase7/http"

export async function DELETE(_request: Request, context: { params: Promise<{ id: string; assetId: string }> }) {
  try { const { supabase, user } = await getBrandKitSession(); if (!user) return NextResponse.json({ errorCode: "UNAUTHORIZED", message: "No autorizado." }, { status: 401 }); const params = await context.params; return NextResponse.json({ kit: await removeBrandKitAsset(supabase, user.id, z.string().uuid().parse(params.id), z.string().uuid().parse(params.assetId)) }) }
  catch (error) { return phaseSevenErrorResponse(error) }
}
