import { z } from "zod"

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Usa un color HEX de seis dígitos.").transform((value) => value.toUpperCase())
export const brandKitTypographySchema = z.object({
  primary: z.string().trim().min(1).max(120),
  secondary: z.string().trim().min(1).max(120).optional(),
  weights: z.array(z.string().regex(/^[1-9]00$/)).min(1).max(9),
}).strict()

const nameSchema = z.string().trim().min(1, "El kit necesita un nombre.").max(120)
const descriptionSchema = z.string().trim().max(1000).nullable()
const colorsSchema = z.array(hexColor).max(12)
const guidelinesSchema = z.string().trim().max(6000)
const negativePromptSchema = z.string().trim().max(3000)
const metadataSchema = z.record(z.string(), z.unknown())

export const createBrandKitSchema = z.object({
  name: nameSchema,
  description: descriptionSchema.optional(),
  colors: colorsSchema.default([]),
  typography: brandKitTypographySchema.default({ primary: "Inter", weights: ["400", "600"] }),
  guidelines: guidelinesSchema.default(""),
  negativePrompt: negativePromptSchema.default(""),
  metadata: metadataSchema.optional(),
}).strict()
export const updateBrandKitSchema = z.object({
  name: nameSchema.optional(),
  description: descriptionSchema.optional(),
  colors: colorsSchema.optional(),
  typography: brandKitTypographySchema.optional(),
  guidelines: guidelinesSchema.optional(),
  negativePrompt: negativePromptSchema.optional(),
  metadata: metadataSchema.optional(),
}).strict().refine((value) => Object.keys(value).length > 0, "Incluye al menos un campo para actualizar.")

export type CreateBrandKitInput = z.infer<typeof createBrandKitSchema>
export type UpdateBrandKitInput = z.infer<typeof updateBrandKitSchema>
export type BrandKitTypography = z.infer<typeof brandKitTypographySchema>

export interface BrandKitAsset {
  id: string
  assetId: string
  kind: "logo" | "reference"
  name: string
  mimeType: string
  signedUrl: string | null
  sortOrder: number
}

export interface BrandKit {
  id: string
  name: string
  description: string | null
  colors: string[]
  typography: BrandKitTypography
  guidelines: string
  negativePrompt: string
  metadata: Record<string, unknown>
  assets: BrandKitAsset[]
  createdAt: string
  updatedAt: string
}
