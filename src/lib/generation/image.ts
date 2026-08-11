import { z } from "zod"

export const imageGenerationRequestSchema = z
  .object({
    mode: z.enum(["create", "variation"]),
    prompt: z.string().trim().min(1, "Escribe una descripción para generar la imagen."),
    model: z.enum(["flux-schnell", "flux-dev"]),
    autoPolish: z.boolean(),
    aspectRatio: z.enum(["1:1", "16:9", "9:16", "4:5"]),
    resolution: z.enum(["1k", "2k"]),
    quality: z.enum(["low", "medium", "high"]),
    steps: z.number().int().min(4).max(50),
    cfgScale: z.number().min(1).max(20),
    referenceAssetIds: z.array(z.string().trim().min(1)).max(12).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.mode === "variation" && !value.referenceAssetIds?.length) {
      context.addIssue({
        code: "custom",
        path: ["referenceAssetIds"],
        message: "Las variaciones requieren al menos una referencia guardada.",
      })
    }
  })
