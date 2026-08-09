import { NextResponse } from "next/server"

import { storyErrorResponse } from "@/lib/story/http"
import { getStorySession, setCreativeProjectPublication } from "@/lib/story/projects"

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { supabase, user } = await getStorySession()
  if (!user) return NextResponse.json({ errorCode: "UNAUTHORIZED", message: "No autorizado." }, { status: 401 })
  try { return NextResponse.json({ project: await setCreativeProjectPublication(supabase, user.id, (await context.params).id, true) }) }
  catch (error) { return storyErrorResponse(error) }
}
