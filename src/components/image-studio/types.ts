import type {
  ImageAspectRatio,
  ImageGenerationMode,
  ImageQuality,
  ImageResolution,
  ImageModel,
} from "@/lib/generation/contracts"

export interface ImageGalleryAsset {
  id: string
  name: string
  signedUrl: string
  createdAt: string
}

export interface ImageStudioBrandKit {
  id: string
  name: string
  guidelines: string
  negativePrompt: string
  assets: Array<{
    assetId: string
    name: string
    signedUrl: string | null
  }>
}

export interface ImageStudioSettings {
  prompt: string
  model: ImageModel
  autoPolish: boolean
  aspectRatio: ImageAspectRatio
  resolution: ImageResolution
  quality: ImageQuality
  steps: number
  cfgScale: number
}

export type ReferenceCategory = "characters" | "brandKit" | "visual"

export interface LocalReference {
  id: string
  name: string
  size: number
  previewUrl: string
}

export type LocalReferences = Record<ReferenceCategory, LocalReference[]>

export interface SelectedReferenceAsset {
  id: string
  name: string
  signedUrl: string
}

export type { ImageGenerationMode }
