import type { VideoAspectRatio, VideoOperation } from "@/lib/generation/contracts"
import type { AssetType } from "@/lib/types"

export type MediaSlot =
  | "sourceVideo"
  | "sourceImage"
  | "endFrame"
  | "characterImage"
  | "motionVideo"
  | "audio"

export interface StudioAsset {
  id: string
  type: AssetType
  name: string
  signedUrl: string
  createdAt: string
  mimeType: string
}

export interface LocalMedia {
  file: File
  previewUrl: string
  type: AssetType
}

export interface VideoStudioFields {
  model: string
  prompt: string
  negativePrompt: string
  aspectRatio: VideoAspectRatio
  durationSeconds: number
  motionStrength: number
  fps: number
  seed: number
  randomSeed: boolean
  cfgScale: number
  stylePreset: string
  cameraMotion: string
  transformStrength: number
  effectTemplate: string
  targetResolution: string
  enhancement: number
  audioMode: string
  syncIntensity: number
  faceRestore: boolean
  extendMode: string
  extendDirection: string
  extensionSeconds: number
  keepCameraMotion: boolean
  syncAudio: boolean
  maskMode: string
  brushSize: number
  characterMode: string
}

export interface VideoStudioState {
  operation: VideoOperation
  fields: VideoStudioFields
  localMedia: Partial<Record<MediaSlot, LocalMedia>>
  savedAssets: Partial<Record<MediaSlot, StudioAsset>>
  feedback: { tone: "error" | "info"; message: string } | null
  submitting: boolean
}
