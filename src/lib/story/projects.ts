import "server-only"

import { buildSeekFilter, decodeSeekCursor, encodeSeekCursor } from "@/lib/pagination/cursor"
import { getPrivateObjectUrl } from "@/lib/storage/r2"
import { createAdminClient } from "@/utils/supabase/admin"
import { createClient } from "@/utils/supabase/server"

import {
  projectListQuerySchema,
  storyDocumentSchema,
  type CreativeProject,
  type CreativeProjectStatus,
  type CreateCreativeProjectInput,
  type UpdateCreativeProjectInput,
} from "./contracts"
import { StoryProjectError } from "./errors"

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

type ProjectRow = {
  id: string
  user_id: string
  kind: CreativeProject["kind"]
  title: string
  description: string | null
  story_type: CreativeProject["storyType"]
  status: CreativeProject["status"]
  visibility: CreativeProject["visibility"]
  cover_asset_id: string | null
  document: unknown
  metadata: unknown
  created_at: string
  updated_at: string
}

function mapRow(row: ProjectRow, coverUrl: string | null = null): CreativeProject {
  const parsedDocument = storyDocumentSchema.safeParse(row.document)
  return {
    id: row.id,
    userId: row.user_id,
    kind: row.kind,
    title: row.title,
    description: row.description,
    storyType: row.story_type,
    status: row.status,
    visibility: row.visibility,
    coverAssetId: row.cover_asset_id,
    coverUrl,
    document: parsedDocument.success ? parsedDocument.data : { version: 1, scenes: [] },
    metadata: row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata) ? row.metadata as Record<string, unknown> : {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

async function resolveCoverUrls(rows: ProjectRow[]) {
  const ids = [...new Set(rows.map((row) => row.cover_asset_id).filter((id): id is string => Boolean(id)))]
  if (!ids.length) return new Map<string, string>()
  try {
    const admin = createAdminClient()
    const { data, error } = await admin.from("assets").select("id,r2_key").in("id", ids)
    if (error) return new Map<string, string>()
    const entries = await Promise.all((data ?? []).map(async (asset) => [asset.id, await getPrivateObjectUrl(asset.r2_key)] as const))
    return new Map(entries)
  } catch {
    return new Map<string, string>()
  }
}

async function withCovers(rows: ProjectRow[]) {
  const urls = await resolveCoverUrls(rows)
  return rows.map((row) => mapRow(row, row.cover_asset_id ? urls.get(row.cover_asset_id) ?? null : null))
}

export async function getStorySession() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return { supabase, user }
}

export async function listCreativeProjects(supabase: SupabaseClient, userId: string, input: unknown) {
  const parsed = projectListQuerySchema.parse(input)
  let query = supabase
    .from("creative_projects")
    .select("id,user_id,kind,title,description,story_type,status,visibility,cover_asset_id,document,metadata,created_at,updated_at")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(parsed.limit + 1)

  query = parsed.scope === "community"
    ? query.eq("visibility", "community").in("status", ["ready", "completed"])
    : query.eq("user_id", userId)
  if (parsed.kind) query = query.eq("kind", parsed.kind)
  if (parsed.status) query = query.eq("status", parsed.status)
  const cursor = decodeSeekCursor(parsed.cursor)
  if (cursor) query = query.or(buildSeekFilter(cursor))

  const { data, error } = await query
  if (error) throw new StoryProjectError("DATABASE_ERROR", `No se pudieron consultar los proyectos: ${error.message}`)
  const rows = (data ?? []) as ProjectRow[]
  const hasMore = rows.length > parsed.limit
  const visibleRows = rows.slice(0, parsed.limit)
  return {
    projects: await withCovers(visibleRows),
    nextCursor: hasMore && visibleRows.at(-1) ? encodeSeekCursor({ createdAt: visibleRows.at(-1)!.created_at, id: visibleRows.at(-1)!.id }) : null,
  }
}

export async function getCreativeProject(supabase: SupabaseClient, userId: string, id: string, allowCommunity = false) {
  let query = supabase
    .from("creative_projects")
    .select("id,user_id,kind,title,description,story_type,status,visibility,cover_asset_id,document,metadata,created_at,updated_at")
    .eq("id", id)
  // RLS already limits this query to the owner or to a published community
  // project. The explicit owner filter keeps private editing endpoints strict,
  // while community reads can rely on the same database policy as list views.
  if (!allowCommunity) query = query.eq("user_id", userId)
  const { data, error } = await query.maybeSingle()
  if (error) throw new StoryProjectError("DATABASE_ERROR", error.message)
  if (!data) throw new StoryProjectError("NOT_FOUND", "Proyecto inexistente.")
  return (await withCovers([data as ProjectRow]))[0]
}

function collectAssetIds(input: { coverAssetId?: string | null; document?: CreateCreativeProjectInput["document"] }) {
  const ids = new Set<string>()
  if (input.coverAssetId) ids.add(input.coverAssetId)
  input.document?.scenes.forEach((scene) => scene.shots.forEach((shot) => shot.assetIds.forEach((id) => ids.add(id))))
  return [...ids]
}

async function assertOwnedAssets(supabase: SupabaseClient, userId: string, input: { coverAssetId?: string | null; document?: CreateCreativeProjectInput["document"] }) {
  const ids = collectAssetIds(input)
  if (!ids.length) return
  const { data, error } = await supabase.from("assets").select("id").eq("user_id", userId).in("id", ids)
  if (error) throw new StoryProjectError("DATABASE_ERROR", error.message)
  if ((data?.length ?? 0) !== ids.length) throw new StoryProjectError("INVALID_ASSET", "Todos los recursos deben pertenecer al usuario autenticado.")
}

export async function createCreativeProject(supabase: SupabaseClient, userId: string, input: CreateCreativeProjectInput) {
  await assertOwnedAssets(supabase, userId, input)
  const { data, error } = await supabase.from("creative_projects").insert({
    user_id: userId,
    kind: input.kind,
    title: input.title,
    description: input.description ?? null,
    story_type: input.storyType ?? null,
    status: "draft",
    visibility: "private",
    cover_asset_id: input.coverAssetId ?? null,
    document: input.document,
    metadata: input.metadata ?? {},
  }).select("id,user_id,kind,title,description,story_type,status,visibility,cover_asset_id,document,metadata,created_at,updated_at").single()
  if (error || !data) throw new StoryProjectError("DATABASE_ERROR", error?.message ?? "No se pudo crear el proyecto.")
  return (await withCovers([data as ProjectRow]))[0]
}

export async function updateCreativeProject(supabase: SupabaseClient, userId: string, id: string, input: UpdateCreativeProjectInput) {
  await getCreativeProject(supabase, userId, id)
  await assertOwnedAssets(supabase, userId, input)
  const updates: Record<string, unknown> = {}
  if (input.title !== undefined) updates.title = input.title
  if (input.description !== undefined) updates.description = input.description
  if (input.storyType !== undefined) updates.story_type = input.storyType
  if (input.coverAssetId !== undefined) updates.cover_asset_id = input.coverAssetId
  if (input.document !== undefined) updates.document = input.document
  if (input.metadata !== undefined) updates.metadata = input.metadata
  if (input.status !== undefined) updates.status = input.status
  const { data, error } = await supabase.from("creative_projects").update(updates).eq("id", id).eq("user_id", userId).select("id,user_id,kind,title,description,story_type,status,visibility,cover_asset_id,document,metadata,created_at,updated_at").single()
  if (error || !data) throw new StoryProjectError("DATABASE_ERROR", error?.message ?? "No se pudo actualizar el proyecto.")
  return (await withCovers([data as ProjectRow]))[0]
}

export async function deleteCreativeProject(supabase: SupabaseClient, userId: string, id: string) {
  await getCreativeProject(supabase, userId, id)
  const { error } = await supabase.from("creative_projects").delete().eq("id", id).eq("user_id", userId)
  if (error) throw new StoryProjectError("DATABASE_ERROR", error.message)
}

export async function setCreativeProjectPublication(supabase: SupabaseClient, userId: string, id: string, publish: boolean) {
  const project = await getCreativeProject(supabase, userId, id)
  if (publish && (!project.coverAssetId || project.document.scenes.length === 0)) {
    throw new StoryProjectError("NOT_PUBLISHABLE", "Añade una portada y al menos una escena antes de publicar.")
  }
  const status: CreativeProjectStatus = publish && project.status === "draft" ? "ready" : project.status
  const { data, error } = await supabase.from("creative_projects").update({ visibility: publish ? "community" : "private", status }).eq("id", id).eq("user_id", userId).select("id,user_id,kind,title,description,story_type,status,visibility,cover_asset_id,document,metadata,created_at,updated_at").single()
  if (error || !data) throw new StoryProjectError("DATABASE_ERROR", error?.message ?? "No se pudo cambiar la publicación.")
  return (await withCovers([data as ProjectRow]))[0]
}

export async function getProjectsForPage(input: unknown) {
  const { supabase, user } = await getStorySession()
  if (!user) return { projects: [], nextCursor: null, error: "No autorizado." }
  try {
    return { ...(await listCreativeProjects(supabase, user.id, input)), error: null }
  } catch {
    return { projects: [], nextCursor: null, error: "La persistencia de Story aún no está disponible en este entorno." }
  }
}

export async function getProjectForPage(id: string) {
  const { supabase, user } = await getStorySession()
  if (!user) return null
  try { return await getCreativeProject(supabase, user.id, id) } catch { return null }
}
