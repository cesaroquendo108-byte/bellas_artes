import { NextResponse } from "next/server"
import { requireAdminApiSession } from "@/lib/phase7/auth"
import { communityStatuses } from "@/lib/social/contracts"
import { listModerationQueue } from "@/lib/social/posts"
import { phaseSevenErrorResponse, sessionErrorResponse } from "@/lib/phase7/http"

export async function GET(request: Request) {
  try { const session = await requireAdminApiSession(); if (!session.ok) return sessionErrorResponse(session.status); const requested = new URL(request.url).searchParams.get("status") ?? "pending"; const status = communityStatuses.find((value) => value === requested) ?? "pending"; return NextResponse.json({ posts: await listModerationQueue(status) }) }
  catch (error) { return phaseSevenErrorResponse(error) }
}
