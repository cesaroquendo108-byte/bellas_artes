import type { ComponentType } from "react"
import { z } from "zod"

const contentBaseSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().trim().min(1).max(180),
  excerpt: z.string().trim().min(1).max(400),
  publishedAt: z.string().date(),
  author: z.string().trim().min(1).max(120),
  cover: z.string().trim().min(1).max(240),
  readingTime: z.string().trim().max(40).optional(),
})

export const blogMetadataSchema = contentBaseSchema.extend({
  category: z.enum(["Featured", "Case Studies", "Bellas Artes Updates", "Feature Guides", "Video Guides", "Image Guides"]),
  featured: z.boolean().optional(),
}).strict()

export const tutorialMetadataSchema = contentBaseSchema.extend({
  category: z.enum(["Image Generation", "Video", "Editing"]),
  level: z.enum(["beginner", "pro"]),
  duration: z.string().trim().min(1).max(40),
  mediaType: z.enum(["video", "guide"]),
  videoUrl: z.url().optional(),
}).strict()

export interface ContentMetadataBase {
  slug: string
  title: string
  excerpt: string
  publishedAt: string
  author: string
  cover: string
  readingTime?: string
}

export interface EditorialMetadata extends ContentMetadataBase {
  category: "Featured" | "Case Studies" | "Bellas Artes Updates" | "Feature Guides" | "Video Guides" | "Image Guides"
  featured?: boolean
}

export interface TutorialMetadata extends ContentMetadataBase {
  category: "Image Generation" | "Video" | "Editing"
  level: "beginner" | "pro"
  duration: string
  mediaType: "video" | "guide"
  videoUrl?: string
}

export type EditorialEntry<T extends ContentMetadataBase = EditorialMetadata> = T & { Content: ComponentType }
