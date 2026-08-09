import { NextResponse } from "next/server"
import { createBrandKitSchema } from "@/lib/brand-kits/contracts"
import { createBrandKit, getBrandKitSession, listBrandKits } from "@/lib/brand-kits/queries"
import { phaseSevenErrorResponse, readJson } from "@/lib/phase7/http"

export async function GET() { try { const { supabase, user } = await getBrandKitSession(); if (!user) return NextResponse.json({ errorCode: "UNAUTHORIZED", message: "No autorizado." }, { status: 401 }); return NextResponse.json({ kits: await listBrandKits(supabase, user.id) }) } catch (error) { return phaseSevenErrorResponse(error) } }
export async function POST(request: Request) { const json = await readJson(request); if (!json.ok) return json.response; try { const { supabase, user } = await getBrandKitSession(); if (!user) return NextResponse.json({ errorCode: "UNAUTHORIZED", message: "No autorizado." }, { status: 401 }); return NextResponse.json({ kit: await createBrandKit(supabase, user.id, createBrandKitSchema.parse(json.body)) }, { status: 201 }) } catch (error) { return phaseSevenErrorResponse(error) } }
