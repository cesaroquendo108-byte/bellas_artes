import type { AssetType } from "@/lib/types"

export type ResourceKind = "character" | "world" | "object" | "background" | "style" | "unclassified"
export type LibraryFilter = "all" | "unsorted" | "labels" | "folders" | "templates"

export interface CharacterWorldAsset {
  id: string
  type: AssetType
  name: string
  signedUrl: string
  createdAt: string
  mimeType: string
  kind: ResourceKind
  labels: string[]
  folderId: string | null
  template: boolean
  prompt: string | null
  model: string | null
  seed: number | null
  gender: string | null
  ageRange: string | null
  style: string | null
}

export interface LibraryStateProps {
  assets: CharacterWorldAsset[]
  libraryError?: string | null
}
