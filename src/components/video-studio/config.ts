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
    title: "Texto a video",
    shortTitle: "T2V",
    description: "Convierte una idea escrita en una secuencia cinematográfica.",
    category: "create",
    defaultModel: "hunyuan-video-1.5-8.3b",
    accent: "from-violet-600 to-indigo-500",
  },
  i2v: {
    operation: "i2v",
    title: "Imagen a video",
    shortTitle: "I2V",
    description: "Anima una imagen con movimiento, cámara y atmósfera.",
    category: "create",
    defaultModel: "hunyuan-video-1.5-8.3b",
    accent: "from-fuchsia-600 to-violet-500",
  },
  v2v: {
    operation: "v2v",
    title: "Video a video",
    shortTitle: "V2V",
    description: "Reinterpreta un video manteniendo su estructura y movimiento.",
    category: "create",
    defaultModel: "hunyuan-video-1.5-8.3b",
    accent: "from-indigo-600 to-cyan-500",
  },
  "action-sync": {
    operation: "action-sync",
    title: "Sincronizar movimiento",
    shortTitle: "Movimiento",
    description: "Transfiere una actuación o baile a un personaje de referencia.",
    category: "edit",
    defaultModel: "liveportrait-motion-v1",
    accent: "from-orange-500 to-fuchsia-600",
  },
  effects: {
    operation: "effects",
    title: "Efectos de video",
    shortTitle: "VFX",
    description: "Aplica efectos generativos con plantillas y dirección por texto.",
    category: "edit",
    defaultModel: "video-vfx-v1",
    accent: "from-pink-600 to-orange-500",
  },
  upscale: {
    operation: "upscale",
    title: "Mejora de video",
    shortTitle: "Mejora",
    description: "Mejora detalle, nitidez y resolución hasta 4K.",
    category: "edit",
    defaultModel: "video-upscale-v1",
    accent: "from-emerald-500 to-cyan-500",
  },
  "lip-sync": {
    operation: "lip-sync",
    title: "Estudio de sincronía labial",
    shortTitle: "Sincronía labial",
    description: "Sincroniza un rostro con texto o una pista de voz.",
    category: "edit",
    defaultModel: "liveportrait-lipsync-v1",
    accent: "from-violet-600 to-pink-500",
  },
  "replace-character": {
    operation: "replace-character",
    title: "Reemplazar personaje",
    shortTitle: "Reemplazar",
    description: "Sustituye un personaje conservando gesto, movimiento y fondo.",
    category: "edit",
    defaultModel: "flux-character-video-v1",
    accent: "from-amber-500 to-violet-600",
  },
  extend: {
    operation: "extend",
    title: "Extender video",
    shortTitle: "Extender",
    description: "Amplía la duración o el encuadre de un video existente.",
    category: "edit",
    defaultModel: "hunyuan-video-extend-v1",
    accent: "from-blue-600 to-violet-500",
  },
}

export const VIDEO_OPERATIONS = Object.keys(VIDEO_TOOL_META) as VideoOperation[]

export function isVideoOperation(value: string): value is VideoOperation {
  return value in VIDEO_TOOL_META
}
