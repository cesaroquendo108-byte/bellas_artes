import { z } from "zod"

export const communityCategories = ["marketing-advertising", "film-stories", "music-video", "animation", "ugc", "anime"] as const
export const communityStatuses = ["draft", "pending", "published", "rejected", "hidden"] as const

export const communityDirectPayloadSchema = z.object({
  kind: z.enum(["image", "video"]),
  targetPath: z.string().trim().startsWith("/").max(240),
  prompt: z.string().trim().max(4000).optional(),
  model: z.string().trim().max(120).optional(),
}).strict().superRefine((value, context) => {
  const validImageTarget = value.kind === "image" && value.targetPath === "/image"
  const validVideoTarget = value.kind === "video" && [
    "/video/t2v",
    "/video/i2v",
    "/video/v2v",
    "/video/action-sync",
    "/video/effects",
    "/video/upscale",
    "/video/lip-sync",
    "/video/replace-character",
    "/video/extend",
  ].includes(value.targetPath)

  if (!validImageTarget && !validVideoTarget) {
    context.addIssue({
      code: "custom",
      path: ["targetPath"],
      message: "El destino debe ser un estudio compatible con el tipo de asset.",
    })
  }
})

export const createCommunityPostSchema = z.object({
  assetId: z.string().uuid(),
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2000).nullable().optional(),
  category: z.enum(communityCategories),
  directPayload: communityDirectPayloadSchema,
  metadata: z.record(z.string(), z.unknown()).optional(),
}).strict()

export const communityListQuerySchema = z.object({
  category: z.enum(communityCategories).optional(),
  cursor: z.string().max(512).optional(),
  limit: z.coerce.number().int().min(1).max(40).default(24),
}).strict()

export const moderationDecisionSchema = z.object({
  decision: z.enum(["approve", "reject", "hide"]),
  note: z.string().trim().max(1000).optional(),
}).strict()

export type CommunityCategory = (typeof communityCategories)[number]
export type CommunityStatus = (typeof communityStatuses)[number]
export type CreateCommunityPostInput = z.infer<typeof createCommunityPostSchema>
export type ModerationDecision = z.infer<typeof moderationDecisionSchema>

export interface CommunityPost {
  id: string
  assetId: string
  assetType: "image" | "video"
  signedUrl: string | null
  title: string
  description: string | null
  category: CommunityCategory
  status: CommunityStatus
  directPayload: z.infer<typeof communityDirectPayloadSchema>
  authorName: string
  authorAvatar: string | null
  createdAt: string
  publishedAt: string | null
  moderationNote?: string | null
}
