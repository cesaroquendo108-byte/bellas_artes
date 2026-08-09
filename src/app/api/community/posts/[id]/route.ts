import { NextResponse } from "next/server"
import { z } from "zod"
import { getSocialSession, getVisiblePost } from "@/lib/social/posts"
import { phaseSevenErrorResponse } from "@/lib/phase7/http"

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try { const { supabase } = await getSocialSession(); const id = z.string().uuid().parse((await context.params).id); return NextResponse.json({ post: await getVisiblePost(supabase, id) }) }
  catch (error) { return phaseSevenErrorResponse(error) }
}
