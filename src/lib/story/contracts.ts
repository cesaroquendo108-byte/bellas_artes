import { z } from "zod"

export const creativeProjectKinds = ["director", "story"] as const
export const creativeProjectStatuses = ["draft", "ready", "processing", "completed", "archived"] as const
export const creativeProjectVisibilities = ["private", "community"] as const
export const storyTemplates = ["music-video", "explainer", "character-vlog", "asmr", "custom"] as const

const uuid = z.string().uuid()

export const storyShotSchema = z.object({
  id: uuid,
  title: z.string().trim().min(1).max(120),
  order: z.number().int().min(0).max(5999),
  durationSeconds: z.number().min(0.5).max(600),
  prompt: z.string().trim().max(4000).default(""),
  camera: z.string().trim().max(120).nullable().default(null),
  transition: z.string().trim().max(120).nullable().default(null),
  assetIds: z.array(uuid).max(16).default([]),
}).strict()

export const storySceneSchema = z.object({
  id: uuid,
  title: z.string().trim().min(1).max(120),
  order: z.number().int().min(0).max(59),
  durationSeconds: z.number().min(0.5).max(600),
  notes: z.string().trim().max(4000).default(""),
  shots: z.array(storyShotSchema).max(100),
}).strict().superRefine((scene, context) => {
  const ids = new Set<string>()
  const orders = new Set<number>()
  scene.shots.forEach((shot, index) => {
    if (ids.has(shot.id)) context.addIssue({ code: "custom", path: ["shots", index, "id"], message: "Los IDs de shots deben ser únicos." })
    if (orders.has(shot.order)) context.addIssue({ code: "custom", path: ["shots", index, "order"], message: "El orden de shots debe ser único." })
    ids.add(shot.id)
    orders.add(shot.order)
  })
})

export const storyDocumentSchema = z.object({
  version: z.literal(1),
  scenes: z.array(storySceneSchema).max(60),
}).strict().superRefine((document, context) => {
  const ids = new Set<string>()
  const orders = new Set<number>()
  document.scenes.forEach((scene, index) => {
    if (ids.has(scene.id)) context.addIssue({ code: "custom", path: ["scenes", index, "id"], message: "Los IDs de escenas deben ser únicos." })
    if (orders.has(scene.order)) context.addIssue({ code: "custom", path: ["scenes", index, "order"], message: "El orden de escenas debe ser único." })
    ids.add(scene.id)
    orders.add(scene.order)
  })
})

const projectBase = {
  title: z.string().trim().min(1, "El proyecto necesita un título.").max(160),
  description: z.string().trim().max(2000).nullable().optional(),
  storyType: z.enum(storyTemplates).nullable().optional(),
  coverAssetId: uuid.nullable().optional(),
  document: storyDocumentSchema,
  metadata: z.record(z.string(), z.unknown()).optional(),
}

export const createCreativeProjectSchema = z.object({
  kind: z.enum(creativeProjectKinds),
  ...projectBase,
}).strict()

export const updateCreativeProjectSchema = z.object({
  title: projectBase.title.optional(),
  description: projectBase.description,
  storyType: projectBase.storyType,
  coverAssetId: projectBase.coverAssetId,
  document: storyDocumentSchema.optional(),
  metadata: projectBase.metadata,
  status: z.enum(creativeProjectStatuses).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, "Incluye al menos un campo para actualizar.")

export const projectListQuerySchema = z.object({
  kind: z.enum(creativeProjectKinds).optional(),
  status: z.enum(creativeProjectStatuses).optional(),
  scope: z.enum(["mine", "community"]).default("mine"),
  cursor: z.string().max(512).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
}).strict()

export type CreativeProjectKind = (typeof creativeProjectKinds)[number]
export type CreativeProjectStatus = (typeof creativeProjectStatuses)[number]
export type CreativeProjectVisibility = (typeof creativeProjectVisibilities)[number]
export type StoryTemplate = (typeof storyTemplates)[number]
export type StoryShot = z.infer<typeof storyShotSchema>
export type StoryScene = z.infer<typeof storySceneSchema>
export type StoryDocument = z.infer<typeof storyDocumentSchema>
export type CreateCreativeProjectInput = z.infer<typeof createCreativeProjectSchema>
export type UpdateCreativeProjectInput = z.infer<typeof updateCreativeProjectSchema>

export interface CreativeProject {
  id: string
  userId: string
  kind: CreativeProjectKind
  title: string
  description: string | null
  storyType: StoryTemplate | null
  status: CreativeProjectStatus
  visibility: CreativeProjectVisibility
  coverAssetId: string | null
  coverUrl: string | null
  document: StoryDocument
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface StoryAssetOption {
  id: string
  name: string
  type: "image" | "video" | "audio"
  signedUrl: string
  category?: string
}
