import type { Json } from "@/lib/database.types"
import type { AssetType } from "@/lib/types"

import type { CharacterWorldAsset, ResourceKind } from "./types"

const kinds = new Set<ResourceKind>(["character", "world", "object", "background", "style"])

function record(value: Json): Record<string, Json | undefined> {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {}
}

export function mapCharacterWorldAsset(asset: { id: string; type: string; name: string; signedUrl: string; created_at: string; mime_type: string; metadata: Json }): CharacterWorldAsset {
  const metadata = record(asset.metadata)
  const rawKind = String(metadata.resourceKind ?? metadata.kind ?? metadata.category ?? "unclassified") as ResourceKind
  const labels = Array.isArray(metadata.labels) ? metadata.labels.filter((label): label is string => typeof label === "string") : []
  const numberSeed = typeof metadata.seed === "number" ? metadata.seed : null
  const stringOrNull = (value: Json | undefined) => typeof value === "string" ? value : null
  return {
    id: asset.id,
    type: (["image", "video", "audio"].includes(asset.type) ? asset.type : "image") as AssetType,
    name: asset.name,
    signedUrl: asset.signedUrl,
    createdAt: asset.created_at,
    mimeType: asset.mime_type,
    kind: kinds.has(rawKind) ? rawKind : "unclassified",
    labels,
    folderId: stringOrNull(metadata.folderId),
    template: metadata.template === true,
    prompt: stringOrNull(metadata.prompt),
    model: stringOrNull(metadata.model),
    seed: numberSeed,
    gender: stringOrNull(metadata.gender),
    ageRange: stringOrNull(metadata.ageRange),
    style: stringOrNull(metadata.style),
  }
}
