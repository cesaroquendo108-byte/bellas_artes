export const generationStatuses = [
  "queued",
  "processing",
  "completed",
  "failed",
  "canceled",
  "not_configured",
] as const

export type GenerationStatus = (typeof generationStatuses)[number]
export type GenerationKind = "image" | "video" | "audio" | "character" | "world"

export type VideoOperation =
  | "t2v"
  | "i2v"
  | "v2v"
  | "action-sync"
  | "effects"
  | "upscale"
  | "lip-sync"
  | "replace-character"
  | "extend"

export interface GenerationJobResponse {
  jobId: string | null
  kind: GenerationKind
  operation?: VideoOperation
  status: GenerationStatus
  creditsReserved: number
  outputAssetIds?: string[]
  assetId?: string
  errorCode?: string
  message?: string
}

export type ImageGenerationMode = "create" | "variation"
export type ImageAspectRatio = "1:1" | "16:9" | "9:16" | "4:5"
export type ImageResolution = "1k" | "2k"
export type ImageQuality = "low" | "medium" | "high"
export type ImageModel = "flux-schnell" | "flux-dev" | "pixart-sigma" | "sd35-medium"

export interface ImageGenerationRequest {
  mode: ImageGenerationMode
  prompt: string
  model: ImageModel
  autoPolish: boolean
  aspectRatio: ImageAspectRatio
  resolution: ImageResolution
  quality: ImageQuality
  steps: number
  cfgScale: number
  referenceAssetIds?: string[]
}

export type VideoAspectRatio = "16:9" | "9:16" | "1:1" | "4:3"
export type VideoParameterValue = string | number | boolean | string[]

export interface VideoGenerationRequest {
  operation: VideoOperation
  model: string
  prompt?: string
  negativePrompt?: string
  aspectRatio?: VideoAspectRatio
  sourceAssetIds?: string[]
  referenceAssetIds?: string[]
  parameters: Record<string, VideoParameterValue>
}
