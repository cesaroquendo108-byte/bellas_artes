import type { Metadata } from "next"

import { MyStoriesDashboard } from "@/components/director-story"
import { getProjectsForPage } from "@/lib/story/projects"

export const metadata: Metadata = { title: "Mis historias · Bellas Artes" }

export default async function MyStoriesPage() {
  const result = await getProjectsForPage({ kind: "story", scope: "mine", limit: 50 })
  return <MyStoriesDashboard projects={result.projects} error={result.error} />
}
