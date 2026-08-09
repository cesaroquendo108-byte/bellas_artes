import { NextResponse } from "next/server"
import { z } from "zod"
import { getSocialSession, getVisiblePost } from "@/lib/social/posts"
import { phaseSevenErrorResponse, PhaseSevenError } from "@/lib/phase7/http"

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { supabase, user } = await getSocialSession()
    if (!user) return NextResponse.json({ errorCode: "UNAUTHORIZED", message: "Inicia sesión para recrear esta publicación." }, { status: 401 })
    const post = await getVisiblePost(supabase, z.string().uuid().parse((await context.params).id))
    if (post.status !== "published") throw new PhaseSevenError("NOT_FOUND", "Publicación inexistente.")
    return NextResponse.json({ targetPath: post.directPayload.targetPath, prompt: post.directPayload.prompt ?? null, model: post.directPayload.model ?? null, sourcePostId: post.id, creditsReserved: 0 })
  } catch (error) { return phaseSevenErrorResponse(error) }
}
