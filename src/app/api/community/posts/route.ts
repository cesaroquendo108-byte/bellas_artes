import { NextResponse } from "next/server"
import { createCommunityPostSchema, communityListQuerySchema } from "@/lib/social/contracts"
import { createCommunityPost, getSocialSession, listPublishedPosts } from "@/lib/social/posts"
import { phaseSevenErrorResponse, readJson } from "@/lib/phase7/http"

export async function GET(request: Request) {
  try { const { supabase } = await getSocialSession(); const input = Object.fromEntries(new URL(request.url).searchParams.entries()); return NextResponse.json(await listPublishedPosts(supabase, communityListQuerySchema.parse(input))) }
  catch (error) { return phaseSevenErrorResponse(error) }
}

export async function POST(request: Request) {
  let session: Awaited<ReturnType<typeof getSocialSession>>
  try { session = await getSocialSession() } catch (error) { return phaseSevenErrorResponse(error) }
  if (!session.user) return NextResponse.json({ errorCode: "UNAUTHORIZED", message: "No autorizado." }, { status: 401 })
  const json = await readJson(request); if (!json.ok) return json.response
  try { return NextResponse.json({ post: await createCommunityPost(session.supabase, session.user.id, createCommunityPostSchema.parse(json.body)) }, { status: 201 }) }
  catch (error) { return phaseSevenErrorResponse(error) }
}
