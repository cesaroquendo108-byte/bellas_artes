export const generationStatuses = [
  "queued",
  "processing",
  "completed",
  "failed",
  "not_configured",
] as const

export type GenerationStatus = (typeof generationStatuses)[number]
export type GenerationKind = "image" | "video"

export interface GenerationJobResponse {
  jobId: string | null
  kind: GenerationKind
  status: GenerationStatus
  creditsReserved: number
  assetId?: string
  errorCode?: string
  message?: string
}

export type ImageGenerationMode = "create" | "variation"
export type ImageAspectRatio = "1:1" | "16:9" | "9:16" | "4:5"
export type ImageResolution = "1k" | "2k"
export type ImageQuality = "low" | "medium" | "high"

export interface ImageGenerationRequest {
  mode: ImageGenerationMode
  prompt: string
  model: "gpt-image-2"
  autoPolish: boolean
  aspectRatio: ImageAspectRatio
  resolution: ImageResolution
  quality: ImageQuality
  steps: number
  cfgScale: number
  referenceAssetIds?: string[]
}
