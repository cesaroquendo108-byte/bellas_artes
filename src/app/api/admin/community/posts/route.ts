import { NextResponse } from "next/server"
import { requireAdminApiSession } from "@/lib/phase7/auth"
import { communityStatuses } from "@/lib/social/contracts"
import { listModerationQueue } from "@/lib/social/posts"
import { phaseSevenErrorResponse } from "@/lib/phase7/http"

export async function GET(request: Request) {
  try { const session = await requireAdminApiSession(); if (!session.ok) return NextResponse.json({ errorCode: session.status === 401 ? "UNAUTHORIZED" : "FORBIDDEN", message: session.status === 401 ? "Inicia sesión para continuar." : "Se requieren permisos de administración." }, { status: session.status }); const requested = new URL(request.url).searchParams.get("status") ?? "pending"; const status = communityStatuses.find((value) => value === requested) ?? "pending"; return NextResponse.json({ posts: await listModerationQueue(status) }) }
  catch (error) { return phaseSevenErrorResponse(error) }
}
