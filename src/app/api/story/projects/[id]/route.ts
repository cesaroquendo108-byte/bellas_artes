import { NextResponse } from "next/server"

import { updateCreativeProjectSchema } from "@/lib/story/contracts"
import { readJson, storyErrorResponse } from "@/lib/story/http"
import { deleteCreativeProject, getCreativeProject, getStorySession, updateCreativeProject } from "@/lib/story/projects"

type Context = { params: Promise<{ id: string }> }

export async function GET(_request: Request, context: Context) {
  const { supabase, user } = await getStorySession()
  if (!user) return NextResponse.json({ errorCode: "UNAUTHORIZED", message: "No autorizado." }, { status: 401 })
  try { return NextResponse.json({ project: await getCreativeProject(supabase, user.id, (await context.params).id, true) }) }
  catch (error) { return storyErrorResponse(error) }
}

export async function PATCH(request: Request, context: Context) {
  const { supabase, user } = await getStorySession()
  if (!user) return NextResponse.json({ errorCode: "UNAUTHORIZED", message: "No autorizado." }, { status: 401 })
  const json = await readJson(request)
  if (!json.ok) return json.response
  try { return NextResponse.json({ project: await updateCreativeProject(supabase, user.id, (await context.params).id, updateCreativeProjectSchema.parse(json.body)) }) }
  catch (error) { return storyErrorResponse(error) }
}

export async function DELETE(_request: Request, context: Context) {
  const { supabase, user } = await getStorySession()
  if (!user) return NextResponse.json({ errorCode: "UNAUTHORIZED", message: "No autorizado." }, { status: 401 })
  try { await deleteCreativeProject(supabase, user.id, (await context.params).id); return new Response(null, { status: 204 }) }
  catch (error) { return storyErrorResponse(error) }
}
