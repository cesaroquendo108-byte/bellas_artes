import { NextResponse } from "next/server"

import { createCreativeProjectSchema, projectListQuerySchema } from "@/lib/story/contracts"
import { storyErrorResponse, readJson } from "@/lib/story/http"
import { createCreativeProject, getStorySession, listCreativeProjects } from "@/lib/story/projects"

export async function GET(request: Request) {
  const { supabase, user } = await getStorySession()
  if (!user) return NextResponse.json({ errorCode: "UNAUTHORIZED", message: "No autorizado." }, { status: 401 })
  try {
    const url = new URL(request.url)
    const input = Object.fromEntries(url.searchParams.entries())
    return NextResponse.json(await listCreativeProjects(supabase, user.id, projectListQuerySchema.parse(input)))
  } catch (error) { return storyErrorResponse(error) }
}

export async function POST(request: Request) {
  const { supabase, user } = await getStorySession()
  if (!user) return NextResponse.json({ errorCode: "UNAUTHORIZED", message: "No autorizado." }, { status: 401 })
  const json = await readJson(request)
  if (!json.ok) return json.response
  try {
    const project = await createCreativeProject(supabase, user.id, createCreativeProjectSchema.parse(json.body))
    return NextResponse.json({ project }, { status: 201 })
  } catch (error) { return storyErrorResponse(error) }
}
