import { blogMetadataSchema, tutorialMetadataSchema, type EditorialEntry, type EditorialMetadata, type TutorialMetadata } from "./types"
import BlogDirector, { metadata as blogDirectorMetadata } from "../../../content/blog/director-de-la-idea-al-storyboard.mdx"
import BlogBrand, { metadata as blogBrandMetadata } from "../../../content/blog/consistencia-visual-con-brand-kits.mdx"
import BlogInspire, { metadata as blogInspireMetadata } from "../../../content/blog/publicar-en-inspire.mdx"
import TutorialImage, { metadata as tutorialImageMetadata } from "../../../content/tutorials/crear-primera-imagen.mdx"
import TutorialVideo, { metadata as tutorialVideoMetadata } from "../../../content/tutorials/video-desde-imagen.mdx"
import TutorialStory, { metadata as tutorialStoryMetadata } from "../../../content/tutorials/editar-storyboard.mdx"
import TutorialBrand, { metadata as tutorialBrandMetadata } from "../../../content/tutorials/preparar-brand-kit.mdx"

export const blogPosts: EditorialEntry<EditorialMetadata>[] = [
  { ...blogMetadataSchema.parse(blogDirectorMetadata), Content: BlogDirector },
  { ...blogMetadataSchema.parse(blogBrandMetadata), Content: BlogBrand },
  { ...blogMetadataSchema.parse(blogInspireMetadata), Content: BlogInspire },
].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))

export const tutorials: EditorialEntry<TutorialMetadata>[] = [
  { ...tutorialMetadataSchema.parse(tutorialImageMetadata), Content: TutorialImage },
  { ...tutorialMetadataSchema.parse(tutorialVideoMetadata), Content: TutorialVideo },
  { ...tutorialMetadataSchema.parse(tutorialStoryMetadata), Content: TutorialStory },
  { ...tutorialMetadataSchema.parse(tutorialBrandMetadata), Content: TutorialBrand },
].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))

export function getBlogPost(slug: string) { return blogPosts.find((post) => post.slug === slug) }
export function getTutorial(slug: string) { return tutorials.find((tutorial) => tutorial.slug === slug) }
