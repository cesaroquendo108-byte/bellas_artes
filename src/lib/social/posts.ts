import "server-only"

import { unstable_cache } from "next/cache"
import { buildSeekFilter, decodeSeekCursor, encodeSeekCursor } from "@/lib/pagination/cursor"
import { PhaseSevenError } from "@/lib/phase7/http"
import { getPrivateObjectUrl } from "@/lib/storage/r2"
import { createAdminClient } from "@/utils/supabase/admin"
import { createClient } from "@/utils/supabase/server"

import { communityDirectPayloadSchema, communityListQuerySchema, type CommunityPost, type CommunityStatus, type CreateCommunityPostInput, type ModerationDecision } from "./contracts"

type Client = Awaited<ReturnType<typeof createClient>>
type PostRow = { id: string; author_id: string; asset_id: string; title: string; description: string | null; category: CommunityPost["category"]; status: CommunityStatus; direct_payload: unknown; author_name_snapshot: string; author_avatar_snapshot: string | null; metadata: unknown; moderation_note: string | null; created_at: string; published_at: string | null }

async function resolveMedia(rows: PostRow[]) {
  const ids = [...new Set(rows.map((row) => row.asset_id))]
  const media = new Map<string, { type: "image" | "video"; signedUrl: string | null }>()
  if (!ids.length) return media
  try {
    const admin = createAdminClient()
    const { data, error } = await admin.from("assets").select("id,type,r2_key,expires_at").in("id", ids)
    if (error) return media
    await Promise.all((data ?? []).map(async (asset) => {
      if (asset.expires_at && new Date(asset.expires_at) <= new Date()) return
      const type = asset.type === "video" ? "video" as const : "image" as const
      let signedUrl: string | null = null
      try { signedUrl = await getPrivateObjectUrl(asset.r2_key, 900) } catch {}
      media.set(asset.id, { type, signedUrl })
    }))
  } catch {}
  return media
}

async function mapRows(rows: PostRow[]): Promise<CommunityPost[]> {
  const media = await resolveMedia(rows)
  return rows.map((row) => {
    const asset = media.get(row.asset_id)
    const parsedPayload = communityDirectPayloadSchema.safeParse(row.direct_payload)
    return { id: row.id, assetId: row.asset_id, assetType: asset?.type ?? "image", signedUrl: asset?.signedUrl ?? null, title: row.title, description: row.description, category: row.category, status: row.status, directPayload: parsedPayload.success ? parsedPayload.data : { kind: "image", targetPath: "/image" }, authorName: row.author_name_snapshot, authorAvatar: row.author_avatar_snapshot, createdAt: row.created_at, publishedAt: row.published_at, moderationNote: row.moderation_note }
  })
}

const columns = "id,author_id,asset_id,title,description,category,status,direct_payload,author_name_snapshot,author_avatar_snapshot,metadata,moderation_note,created_at,published_at"

const getCachedPublishedPosts = unstable_cache(
  async (category: CommunityPost["category"] | null, limit: number, cursor: string | null) => {
    const admin = createAdminClient()
    return listPublishedPosts(admin, {
      category: category ?? undefined,
      limit,
      cursor: cursor ?? undefined,
    })
  },
  ["public-inspire-feed"],
  { revalidate: 60 },
)

export async function getSocialSession() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return { supabase, user }
}

export async function listPublishedPosts(client: Client, input: unknown) {
  const parsed = communityListQuerySchema.parse(input)
  let query = client.from("community_posts").select(columns).eq("status", "published").order("created_at", { ascending: false }).order("id", { ascending: false }).limit(parsed.limit + 1)
  if (parsed.category) query = query.eq("category", parsed.category)
  const cursor = decodeSeekCursor(parsed.cursor)
  if (cursor) query = query.or(buildSeekFilter(cursor))
  const { data, error } = await query
  if (error) throw new PhaseSevenError("DATABASE_ERROR", error.message)
  const rows = (data ?? []) as PostRow[]
  const visible = rows.slice(0, parsed.limit)
  return { posts: await mapRows(visible), nextCursor: rows.length > parsed.limit && visible.at(-1) ? encodeSeekCursor({ createdAt: visible.at(-1)!.created_at, id: visible.at(-1)!.id }) : null }
}

export async function getVisiblePost(client: Client, id: string) {
  const { data, error } = await client.from("community_posts").select(columns).eq("id", id).maybeSingle()
  if (error) throw new PhaseSevenError("DATABASE_ERROR", error.message)
  if (!data) throw new PhaseSevenError("NOT_FOUND", "Publicación inexistente.")
  return (await mapRows([data as PostRow]))[0]
}

export async function createCommunityPost(client: Client, userId: string, input: CreateCommunityPostInput) {
  const [{ data: asset, error: assetError }, { data: profile }] = await Promise.all([
    client.from("assets").select("id,type,expires_at").eq("id", input.assetId).eq("user_id", userId).maybeSingle(),
    client.from("users").select("display_name,avatar_url").eq("id", userId).maybeSingle(),
  ])
  if (assetError) throw new PhaseSevenError("DATABASE_ERROR", assetError.message)
  if (!asset || !["image", "video"].includes(asset.type)) throw new PhaseSevenError("INVALID_ASSET", "Selecciona una imagen o video propio.")
  if (asset.expires_at && new Date(asset.expires_at) <= new Date()) throw new PhaseSevenError("INVALID_ASSET", "El recurso seleccionado ya expiró.")
  const { data, error } = await client.from("community_posts").insert({ author_id: userId, asset_id: input.assetId, title: input.title, description: input.description ?? null, category: input.category, status: "pending", direct_payload: input.directPayload, author_name_snapshot: profile?.display_name?.trim() || "Artista de Bellas Artes", author_avatar_snapshot: profile?.avatar_url ?? null, metadata: input.metadata ?? {} }).select(columns).single()
  if (error || !data) throw new PhaseSevenError("DATABASE_ERROR", error?.message ?? "No se pudo enviar la publicación.")
  return (await mapRows([data as PostRow]))[0]
}

export async function listModerationQueue(status: CommunityStatus = "pending", limit = 40) {
  const admin = createAdminClient()
  const { data, error } = await admin.from("community_posts").select(columns).eq("status", status).order("created_at", { ascending: true }).limit(Math.min(Math.max(limit, 1), 100))
  if (error) throw new PhaseSevenError("DATABASE_ERROR", error.message)
  return mapRows((data ?? []) as PostRow[])
}

export async function moderateCommunityPost(postId: string, moderatorId: string, input: ModerationDecision) {
  const admin = createAdminClient()
  const { data: current, error: currentError } = await admin.from("community_posts").select("id,asset_id,status").eq("id", postId).maybeSingle()
  if (currentError) throw new PhaseSevenError("DATABASE_ERROR", currentError.message)
  if (!current) throw new PhaseSevenError("NOT_FOUND", "Publicación inexistente.")
  const status: CommunityStatus = input.decision === "approve" ? "published" : input.decision === "reject" ? "rejected" : "hidden"
  if (status === "published") {
    const { data: asset } = await admin.from("assets").select("metadata").eq("id", current.asset_id).maybeSingle()
    const metadata = asset?.metadata && typeof asset.metadata === "object" && !Array.isArray(asset.metadata) ? asset.metadata : {}
    await admin.from("assets").update({ expires_at: null, metadata: { ...metadata, communityPublished: true } }).eq("id", current.asset_id)
  }
  const { data, error } = await admin.from("community_posts").update({ status, moderated_by: moderatorId, moderation_note: input.note ?? null, published_at: status === "published" ? new Date().toISOString() : null }).eq("id", postId).select(columns).single()
  if (error || !data) throw new PhaseSevenError("DATABASE_ERROR", error?.message ?? "No se pudo moderar la publicación.")
  return (await mapRows([data as PostRow]))[0]
}

export async function getPublishedPostsForPage(input: unknown) {
  try {
    const parsed = communityListQuerySchema.parse(input)
    return {
      ...(await getCachedPublishedPosts(parsed.category ?? null, parsed.limit, parsed.cursor ?? null)),
      error: null,
    }
  }
  catch { return { posts: [], nextCursor: null, error: "La comunidad no está disponible en este entorno." } }
}
