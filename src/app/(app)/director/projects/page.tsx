import type { Metadata } from "next"

import { DirectorProjects } from "@/components/director-story"
import { getProjectsForPage } from "@/lib/story/projects"

export const metadata: Metadata = { title: "Proyectos del director · Bellas Artes" }

export default async function DirectorProjectsPage() {
  const result = await getProjectsForPage({ kind: "director", scope: "mine", limit: 50 })
  return <div className="-m-4 sm:-m-6 lg:-m-8"><DirectorProjects projects={result.projects} error={result.error} /></div>
}
