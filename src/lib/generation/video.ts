import { z } from "zod"

const parameterValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.string()),
])

export const videoOperations = [
  "t2v",
  "i2v",
  "v2v",
  "action-sync",
  "effects",
  "upscale",
  "lip-sync",
  "replace-character",
  "extend",
] as const

export const videoModels = [
  "hunyuan-video-1.5-8.3b",
  "hunyuan-video-13b-pro",
  "wan22-ti2v-5b",
  "hunyuan-video-original",
  "liveportrait-motion-v1",
  "video-vfx-v1",
  "video-upscale-v1",
  "liveportrait-lipsync-v1",
  "flux-character-video-v1",
  "hunyuan-video-extend-v1",
] as const

export const videoGenerationRequestSchema = z
  .object({
    operation: z.enum(videoOperations),
    model: z.enum(videoModels),
    prompt: z.string().trim().optional(),
    negativePrompt: z.string().trim().optional(),
    aspectRatio: z.enum(["16:9", "9:16", "1:1", "4:3"]).optional(),
    sourceAssetIds: z.array(z.string().trim().min(1)).max(4).optional(),
    referenceAssetIds: z.array(z.string().trim().min(1)).max(8).optional(),
    parameters: z.record(z.string(), parameterValueSchema),
  })
  .strict()
  .superRefine((value, context) => {
    const requirePrompt = value.operation === "t2v"
    if (requirePrompt && !value.prompt) {
      context.addIssue({ code: "custom", path: ["prompt"], message: "La operación de texto a video requiere una descripción." })
    }

    const sourceRequired = ["i2v", "v2v", "action-sync", "effects", "upscale", "lip-sync", "replace-character", "extend"].includes(value.operation)
    if (sourceRequired && !value.sourceAssetIds?.length) {
      context.addIssue({ code: "custom", path: ["sourceAssetIds"], message: "Esta operación requiere un video guardado." })
    }

    const referenceRequired = ["action-sync", "replace-character"].includes(value.operation)
    if (referenceRequired && !value.referenceAssetIds?.length) {
      context.addIssue({ code: "custom", path: ["referenceAssetIds"], message: "Esta operación requiere una referencia guardada." })
    }

    if (value.operation === "effects" && typeof value.parameters.effectTemplate !== "string") {
      context.addIssue({ code: "custom", path: ["parameters", "effectTemplate"], message: "Selecciona un efecto." })
    }

    if (value.operation === "upscale" && !["2k", "4k"].includes(String(value.parameters.targetResolution))) {
      context.addIssue({ code: "custom", path: ["parameters", "targetResolution"], message: "La resolución debe ser 2k o 4k." })
    }

    if (value.operation === "lip-sync") {
      const audioMode = value.parameters.audioMode
      const hasAudio = Boolean(value.referenceAssetIds?.length)
      if (audioMode === "tts" && !value.prompt) {
        context.addIssue({ code: "custom", path: ["prompt"], message: "Texto a voz requiere un guion." })
      }
      if (audioMode !== "tts" && !hasAudio) {
        context.addIssue({ code: "custom", path: ["referenceAssetIds"], message: "Lip-Sync requiere un audio guardado." })
      }
    }

    if (value.operation === "extend") {
      if (!["time", "spatial"].includes(String(value.parameters.extendMode))) {
        context.addIssue({ code: "custom", path: ["parameters", "extendMode"], message: "Selecciona el modo de extensión." })
      }
      const seconds = Number(value.parameters.extensionSeconds)
      if (value.parameters.extendMode === "time" && (!Number.isFinite(seconds) || seconds < 2 || seconds > 15)) {
        context.addIssue({ code: "custom", path: ["parameters", "extensionSeconds"], message: "La extensión debe estar entre 2 y 15 segundos." })
      }
      if (!["forward", "backward", "both", "left", "right", "up", "down", "all"].includes(String(value.parameters.extendDirection))) {
        context.addIssue({ code: "custom", path: ["parameters", "extendDirection"], message: "Selecciona una dirección de extensión válida." })
      }
    }
  })
