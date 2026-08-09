import type {
  ImageAspectRatio,
  ImageGenerationMode,
  ImageQuality,
  ImageResolution,
} from "@/lib/generation/contracts"

export interface ImageGalleryAsset {
  id: string
  name: string
  signedUrl: string
  createdAt: string
}

export interface ImageStudioSettings {
  prompt: string
  model: "gpt-image-2"
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
