import { z } from "zod"

export const characterModels = ["nano-banana-pro", "seedream-4", "kling-3-omni", "flux-1-dev"] as const
export const worldModels = ["kling-3-omni", "flux-1-dev"] as const
export const characterWorldAspectRatios = ["1:1", "9:16", "16:9", "4:5"] as const

const assetIdsSchema = z.array(z.string().uuid("Los assets deben usar IDs UUID válidos.")).max(12).optional()

const structuredCharacterSchema = z.object({
  gender: z.string().trim().min(1),
  ethnicity: z.string().trim().min(1),
  ageRange: z.string().trim().min(1),
  bodyType: z.string().trim().min(1),
  aesthetic: z.string().trim().min(1),
  expression: z.string().trim().min(1),
  pose: z.string().trim().min(1),
}).strict()

export const characterGenerationRequestSchema = z.object({
  mode: z.enum(["reference", "prompt", "structured"]),
  prompt: z.string().trim().max(4000).optional(),
  model: z.enum(characterModels),
  aspectRatio: z.enum(characterWorldAspectRatios),
  cfgScale: z.number().min(1).max(20),
  steps: z.number().int().min(4).max(50),
  seed: z.number().int().min(0).max(2_147_483_647),
  randomSeed: z.boolean(),
  faceWeight: z.number().min(0).max(1),
  referenceAssetIds: assetIdsSchema,
  structured: structuredCharacterSchema.optional(),
}).strict().superRefine((value, context) => {
  if (value.mode === "reference" && !value.referenceAssetIds?.length) {
    context.addIssue({ code: "custom", path: ["referenceAssetIds"], message: "El modo referencia requiere al menos un asset guardado." })
  }
  if (value.mode === "prompt" && !value.prompt) {
    context.addIssue({ code: "custom", path: ["prompt"], message: "El modo prompt requiere una descripción." })
  }
  if (value.mode === "structured" && !value.structured) {
    context.addIssue({ code: "custom", path: ["structured"], message: "Completa el constructor estructurado." })
  }
})

export const worldGenerationRequestSchema = z.object({
  prompt: z.string().trim().min(1, "Describe el mundo que deseas crear.").max(4000),
  model: z.enum(worldModels),
  aspectRatio: z.enum(characterWorldAspectRatios),
  cfgScale: z.number().min(1).max(20),
  seed: z.number().int().min(0).max(2_147_483_647),
  randomSeed: z.boolean(),
  referenceAssetIds: assetIdsSchema,
}).strict()

export type CharacterGenerationRequest = z.infer<typeof characterGenerationRequestSchema>
export type WorldGenerationRequest = z.infer<typeof worldGenerationRequestSchema>
export type CharacterWorldKind = "character" | "world"

export function normalizeCharacterGenerationRequest(input: CharacterGenerationRequest) {
  if (input.prompt) return input
  if (input.structured) {
    return {
      ...input,
      prompt: Object.entries(input.structured).map(([key, value]) => `${key}: ${value}`).join(", "),
    }
  }
  return {
    ...input,
    prompt: "Mantener la identidad facial y visual de las referencias suministradas.",
  }
}

export interface CharacterWorldJobResponse {
  jobId: string | null
  kind: CharacterWorldKind
  status: "queued" | "processing" | "completed" | "failed" | "not_configured"
  creditsReserved: number
  assetId?: string
  errorCode?: string
  message?: string
}
