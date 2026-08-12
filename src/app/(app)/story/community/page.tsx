import type { Metadata } from "next"

import { CommunityStories } from "@/components/director-story"
import { getProjectsForPage } from "@/lib/story/projects"

export const metadata: Metadata = { title: "Historias de la comunidad · Bellas Artes" }

export default async function CommunityStoriesPage() {
  const result = await getProjectsForPage({ kind: "story", scope: "community", limit: 20 })
  return <CommunityStories initialProjects={result.projects} initialCursor={result.nextCursor} initialError={result.error} />
}
