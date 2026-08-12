import type { Metadata } from "next"

import { DirectorProjects } from "@/components/director-story"
import { getProjectsForPage } from "@/lib/story/projects"

export const metadata: Metadata = { title: "Proyectos del director · Bellas Artes" }

export default async function DirectorProjectsPage() {
  const result = await getProjectsForPage({ kind: "director", scope: "mine", limit: 50 })
  return <DirectorProjects projects={result.projects} error={result.error} />
}
