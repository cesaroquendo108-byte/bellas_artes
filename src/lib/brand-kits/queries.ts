import "server-only"

import { randomUUID } from "node:crypto"
import { PhaseSevenError } from "@/lib/phase7/http"
import { deletePrivateObject, getPrivateObjectUrl, uploadPrivateObject } from "@/lib/storage/r2"
import { createAdminClient } from "@/utils/supabase/admin"
import { createClient } from "@/utils/supabase/server"
import { brandKitTypographySchema, type BrandKit, type BrandKitAsset, type CreateBrandKitInput, type UpdateBrandKitInput } from "./contracts"

type Client = Awaited<ReturnType<typeof createClient>>
type KitRow = { id: string; user_id: string; name: string; description: string | null; colors: unknown; typography: unknown; guidelines: string; negative_prompt: string; metadata: unknown; created_at: string; updated_at: string }
type LinkRow = { id: string; brand_kit_id: string; asset_id: string; kind: BrandKitAsset["kind"]; sort_order: number }
const kitColumns = "id,user_id,name,description,colors,typography,guidelines,negative_prompt,metadata,created_at,updated_at"

export async function getBrandKitSession() { const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser(); return { supabase, user } }

async function mapKits(client: Client, rows: KitRow[]): Promise<BrandKit[]> {
  if (!rows.length) return []
  const kitIds = rows.map((row) => row.id)
  const { data: links, error } = await client.from("brand_kit_assets").select("id,brand_kit_id,asset_id,kind,sort_order").in("brand_kit_id", kitIds).order("sort_order")
  if (error) throw new PhaseSevenError("DATABASE_ERROR", error.message)
  const typedLinks = (links ?? []) as LinkRow[]
  const assetIds = [...new Set(typedLinks.map((link) => link.asset_id))]
  const assetMap = new Map<string, { name: string; mime_type: string; signedUrl: string | null }>()
  if (assetIds.length) {
    try {
      const admin = createAdminClient(); const { data } = await admin.from("assets").select("id,name,mime_type,r2_key").in("id", assetIds)
      await Promise.all((data ?? []).map(async (asset) => { let signedUrl: string | null = null; try { signedUrl = await getPrivateObjectUrl(asset.r2_key) } catch {}; assetMap.set(asset.id, { name: asset.name, mime_type: asset.mime_type, signedUrl }) }))
    } catch {}
  }
  return rows.map((row) => ({ id: row.id, name: row.name, description: row.description, colors: Array.isArray(row.colors) ? row.colors.filter((value): value is string => typeof value === "string") : [], typography: brandKitTypographySchema.safeParse(row.typography).success ? brandKitTypographySchema.parse(row.typography) : { primary: "Inter", weights: ["400", "600"] }, guidelines: row.guidelines, negativePrompt: row.negative_prompt, metadata: row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata) ? row.metadata as Record<string, unknown> : {}, assets: typedLinks.filter((link) => link.brand_kit_id === row.id).map((link) => { const asset = assetMap.get(link.asset_id); return { id: link.id, assetId: link.asset_id, kind: link.kind, name: asset?.name ?? "Recurso no disponible", mimeType: asset?.mime_type ?? "image/unknown", signedUrl: asset?.signedUrl ?? null, sortOrder: link.sort_order } }), createdAt: row.created_at, updatedAt: row.updated_at }))
}

export async function listBrandKits(client: Client, userId: string) { const { data, error } = await client.from("brand_kits").select(kitColumns).eq("user_id", userId).order("updated_at", { ascending: false }); if (error) throw new PhaseSevenError("DATABASE_ERROR", error.message); return mapKits(client, (data ?? []) as KitRow[]) }
export async function getBrandKit(client: Client, userId: string, id: string) { const { data, error } = await client.from("brand_kits").select(kitColumns).eq("id", id).eq("user_id", userId).maybeSingle(); if (error) throw new PhaseSevenError("DATABASE_ERROR", error.message); if (!data) throw new PhaseSevenError("NOT_FOUND", "Brand Kit inexistente."); return (await mapKits(client, [data as KitRow]))[0] }
export async function createBrandKit(client: Client, userId: string, input: CreateBrandKitInput) { const { data, error } = await client.from("brand_kits").insert({ user_id: userId, name: input.name, description: input.description ?? null, colors: input.colors, typography: input.typography, guidelines: input.guidelines, negative_prompt: input.negativePrompt, metadata: input.metadata ?? {} }).select(kitColumns).single(); if (error || !data) throw new PhaseSevenError("DATABASE_ERROR", error?.message ?? "No se pudo crear el kit."); return (await mapKits(client, [data as KitRow]))[0] }
export async function updateBrandKit(client: Client, userId: string, id: string, input: UpdateBrandKitInput) { await getBrandKit(client, userId, id); const changes: Record<string, unknown> = {}; if (input.name !== undefined) changes.name = input.name; if (input.description !== undefined) changes.description = input.description; if (input.colors !== undefined) changes.colors = input.colors; if (input.typography !== undefined) changes.typography = input.typography; if (input.guidelines !== undefined) changes.guidelines = input.guidelines; if (input.negativePrompt !== undefined) changes.negative_prompt = input.negativePrompt; if (input.metadata !== undefined) changes.metadata = input.metadata; const { data, error } = await client.from("brand_kits").update(changes).eq("id", id).eq("user_id", userId).select(kitColumns).single(); if (error || !data) throw new PhaseSevenError("DATABASE_ERROR", error?.message ?? "No se pudo guardar el kit."); return (await mapKits(client, [data as KitRow]))[0] }
export async function deleteBrandKit(client: Client, userId: string, id: string) { await getBrandKit(client, userId, id); const { error } = await client.from("brand_kits").delete().eq("id", id).eq("user_id", userId); if (error) throw new PhaseSevenError("DATABASE_ERROR", error.message) }

const acceptedLogoTypes = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml"])
export const MAX_BRAND_ASSET_BYTES = 20 * 1024 * 1024

export async function addBrandKitAsset(client: Client, userId: string, kitId: string, file: File, kind: BrandKitAsset["kind"]) {
  const kit = await getBrandKit(client, userId, kitId)
  if (kit.assets.length >= 10) throw new PhaseSevenError("LIMIT_EXCEEDED", "El Brand Kit ya tiene 10 recursos.")
  if (!acceptedLogoTypes.has(file.type) || file.size <= 0 || file.size > MAX_BRAND_ASSET_BYTES) throw new PhaseSevenError("INVALID_ASSET", "Usa PNG, JPG, WEBP o SVG de hasta 20 MB.")
  const bytes = new Uint8Array(await file.arrayBuffer())
  if (file.type === "image/svg+xml") { const source = new TextDecoder().decode(bytes); if (/<script|javascript:|<foreignobject|<!doctype|<!entity|\son[a-z]+\s*=/i.test(source)) throw new PhaseSevenError("INVALID_ASSET", "El SVG contiene contenido no permitido.") }
  const extension = file.type === "image/svg+xml" ? "svg" : file.type.split("/")[1]?.replace("jpeg", "jpg") ?? "bin"
  const key = `brand-kits/${userId}/${kitId}/${randomUUID()}.${extension}`
  await uploadPrivateObject({ key, body: bytes, contentType: file.type, metadata: { userId, brandKitId: kitId, kind } })
  const admin = createAdminClient()
  const { data: asset, error: assetError } = await admin.from("assets").insert({ user_id: userId, type: "image", name: file.name.slice(0, 180) || "Logo", r2_key: key, mime_type: file.type, bytes: file.size, metadata: { source: "brand-kit", brandKitId: kitId, kind } }).select("id").single()
  if (assetError || !asset) {
    await deletePrivateObject(key).catch(() => undefined)
    throw new PhaseSevenError("DATABASE_ERROR", assetError?.message ?? "No se pudo registrar el recurso.")
  }
  const { error } = await client.from("brand_kit_assets").insert({ brand_kit_id: kitId, asset_id: asset.id, kind, sort_order: kit.assets.length })
  if (error) {
    await admin.from("assets").delete().eq("id", asset.id)
    await deletePrivateObject(key).catch(() => undefined)
    throw new PhaseSevenError("DATABASE_ERROR", error.message)
  }
  return getBrandKit(client, userId, kitId)
}

export async function removeBrandKitAsset(client: Client, userId: string, kitId: string, assetId: string) { await getBrandKit(client, userId, kitId); const { error } = await client.from("brand_kit_assets").delete().eq("brand_kit_id", kitId).eq("asset_id", assetId); if (error) throw new PhaseSevenError("DATABASE_ERROR", error.message); return getBrandKit(client, userId, kitId) }
export async function getBrandKitsForPage() { const { supabase, user } = await getBrandKitSession(); if (!user) return { kits: [], error: "No autorizado." }; try { return { kits: await listBrandKits(supabase, user.id), error: null } } catch { return { kits: [], error: "Los Brand Kits no están disponibles en este entorno." } } }
export async function getBrandKitForPage(id: string) { const { supabase, user } = await getBrandKitSession(); if (!user) return null; try { return await getBrandKit(supabase, user.id, id) } catch { return null } }
