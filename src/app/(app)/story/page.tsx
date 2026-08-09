import type { Metadata } from "next"

import { StoryHub } from "@/components/director-story"
import { getProjectsForPage } from "@/lib/story/projects"

export const metadata: Metadata = { title: "Historias · Bellas Artes", description: "Storyboarding persistente para producciones generativas." }

export default async function StoryPage() {
  const result = await getProjectsForPage({ kind: "story", scope: "community", limit: 8 })
  return <div className="-m-4 sm:-m-6 lg:-m-8"><StoryHub community={result.projects} error={result.error} /></div>
}
