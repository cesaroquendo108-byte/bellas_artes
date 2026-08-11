import type { Metadata } from "next"

import { DirectorHub } from "@/components/director-story"
import { getProjectsForPage } from "@/lib/story/projects"

export const metadata: Metadata = { title: "Director con IA · Bellas Artes", description: "Proyectos narrativos y dirección generativa." }

export default async function DirectorPage({ searchParams }: { searchParams: Promise<{ template?: string; prompt?: string }> }) {
  const [{ template, prompt }, mine, community] = await Promise.all([searchParams, getProjectsForPage({ kind: "director", scope: "mine", limit: 8 }), getProjectsForPage({ kind: "story", scope: "community", limit: 12 })])
  return <div className="-m-4 sm:-m-6 lg:-m-8"><DirectorHub projects={mine.projects} community={community.projects} error={mine.error ?? community.error} initialTemplate={template} initialPrompt={typeof prompt === "string" ? prompt : ""} /></div>
}
