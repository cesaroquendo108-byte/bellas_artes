import { NextResponse } from "next/server"
import { z } from "zod"
import { requireAdminApiSession } from "@/lib/phase7/auth"
import { moderationDecisionSchema } from "@/lib/social/contracts"
import { moderateCommunityPost } from "@/lib/social/posts"
import { phaseSevenErrorResponse, readJson, sessionErrorResponse } from "@/lib/phase7/http"

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const json = await readJson(request); if (!json.ok) return json.response
  try { const session = await requireAdminApiSession(); if (!session.ok) return sessionErrorResponse(session.status); const id = z.string().uuid().parse((await context.params).id); return NextResponse.json({ post: await moderateCommunityPost(id, session.user.id, moderationDecisionSchema.parse(json.body)) }) }
  catch (error) { return phaseSevenErrorResponse(error) }
}
