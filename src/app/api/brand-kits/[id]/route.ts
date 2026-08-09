import { NextResponse } from "next/server"
import { z } from "zod"
import { updateBrandKitSchema } from "@/lib/brand-kits/contracts"
import { deleteBrandKit, getBrandKit, getBrandKitSession, updateBrandKit } from "@/lib/brand-kits/queries"
import { phaseSevenErrorResponse, readJson } from "@/lib/phase7/http"

type Context = { params: Promise<{ id: string }> }
async function context() { const { supabase, user } = await getBrandKitSession(); if (!user) return null; return { supabase, user } }
export async function GET(_request: Request, route: Context) { try { const session = await context(); if (!session) return NextResponse.json({ errorCode: "UNAUTHORIZED", message: "No autorizado." }, { status: 401 }); return NextResponse.json({ kit: await getBrandKit(session.supabase, session.user.id, z.string().uuid().parse((await route.params).id)) }) } catch (error) { return phaseSevenErrorResponse(error) } }
export async function PATCH(request: Request, route: Context) { const json = await readJson(request); if (!json.ok) return json.response; try { const session = await context(); if (!session) return NextResponse.json({ errorCode: "UNAUTHORIZED", message: "No autorizado." }, { status: 401 }); return NextResponse.json({ kit: await updateBrandKit(session.supabase, session.user.id, z.string().uuid().parse((await route.params).id), updateBrandKitSchema.parse(json.body)) }) } catch (error) { return phaseSevenErrorResponse(error) } }
export async function DELETE(_request: Request, route: Context) { try { const session = await context(); if (!session) return NextResponse.json({ errorCode: "UNAUTHORIZED", message: "No autorizado." }, { status: 401 }); await deleteBrandKit(session.supabase, session.user.id, z.string().uuid().parse((await route.params).id)); return new Response(null, { status: 204 }) } catch (error) { return phaseSevenErrorResponse(error) } }
