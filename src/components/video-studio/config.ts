import type { VideoOperation } from "@/lib/generation/contracts"

export interface VideoToolMeta {
  operation: VideoOperation
  title: string
  shortTitle: string
  description: string
  category: "create" | "edit"
  defaultModel: string
  accent: string
}

export const VIDEO_TOOL_META: Record<VideoOperation, VideoToolMeta> = {
  t2v: {
    operation: "t2v",
    title: "Text to Video",
    shortTitle: "T2V",
    description: "Convierte una idea escrita en una secuencia cinematográfica.",
    category: "create",
    defaultModel: "openart-video-v2",
    accent: "from-violet-600 to-indigo-500",
  },
  i2v: {
    operation: "i2v",
    title: "Image to Video",
    shortTitle: "I2V",
    description: "Anima una imagen con movimiento, cámara y atmósfera.",
    category: "create",
    defaultModel: "openart-animate-v2",
    accent: "from-fuchsia-600 to-violet-500",
  },
  v2v: {
    operation: "v2v",
    title: "Video to Video",
    shortTitle: "V2V",
    description: "Reinterpreta un video manteniendo su estructura y movimiento.",
    category: "create",
    defaultModel: "openart-v2v-2.5",
    accent: "from-indigo-600 to-cyan-500",
  },
  "action-sync": {
    operation: "action-sync",
    title: "Action Sync",
    shortTitle: "Motion",
    description: "Transfiere una actuación o baile a un personaje de referencia.",
    category: "edit",
    defaultModel: "motion-sync-v2",
    accent: "from-orange-500 to-fuchsia-600",
  },
  effects: {
    operation: "effects",
    title: "Video Effects",
    shortTitle: "VFX",
    description: "Aplica efectos generativos con plantillas y dirección por texto.",
    category: "edit",
    defaultModel: "seedance-2",
    accent: "from-pink-600 to-orange-500",
  },
  upscale: {
    operation: "upscale",
    title: "Video Upscale",
    shortTitle: "Upscale",
    description: "Mejora detalle, nitidez y resolución hasta 4K.",
    category: "edit",
    defaultModel: "video-upscaler-v2",
    accent: "from-emerald-500 to-cyan-500",
  },
  "lip-sync": {
    operation: "lip-sync",
    title: "Lip-Sync Studio",
    shortTitle: "Lip-Sync",
    description: "Sincroniza un rostro con texto o una pista de voz.",
    category: "edit",
    defaultModel: "lip-sync-v2.5",
    accent: "from-violet-600 to-pink-500",
  },
  "replace-character": {
    operation: "replace-character",
    title: "Replace Character",
    shortTitle: "Replace",
    description: "Sustituye un personaje conservando gesto, movimiento y fondo.",
    category: "edit",
    defaultModel: "character-swap-v2",
    accent: "from-amber-500 to-violet-600",
  },
  extend: {
    operation: "extend",
    title: "Extend Video",
    shortTitle: "Extend",
    description: "Amplía la duración o el encuadre de un video existente.",
    category: "edit",
    defaultModel: "kling-extend-v1.5",
    accent: "from-blue-600 to-violet-500",
  },
}

export const VIDEO_OPERATIONS = Object.keys(VIDEO_TOOL_META) as VideoOperation[]

export function isVideoOperation(value: string): value is VideoOperation {
  return value in VIDEO_TOOL_META
}
