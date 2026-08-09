import type { Metadata } from "next"

import { StoryboardEditor } from "@/components/director-story"
import { getStoryAssets } from "@/lib/story/assets"
import { creativeProjectKinds, storyTemplates, type CreativeProjectKind, type StoryTemplate } from "@/lib/story/contracts"
import { getProjectForPage } from "@/lib/story/projects"

export const metadata: Metadata = { title: "Editor de storyboard · Bellas Artes" }

export default async function StoryCreatePage({ searchParams }: { searchParams: Promise<{ project?: string; template?: string; kind?: string; view?: string }> }) {
  const params = await searchParams
  const template = storyTemplates.includes(params.template as StoryTemplate) ? params.template as StoryTemplate : "custom"
  const kind = creativeProjectKinds.includes(params.kind as CreativeProjectKind) ? params.kind as CreativeProjectKind : "story"
  const initialView = params.view === "timeline" || params.view === "preview" ? params.view : "storyboard"
  const [project, library] = await Promise.all([params.project ? getProjectForPage(params.project) : Promise.resolve(null), getStoryAssets()])
  return <div className="-m-4 sm:-m-6 lg:-m-8"><StoryboardEditor project={project} assets={library.assets} template={template} kind={project?.kind ?? kind} initialView={initialView} /></div>
}
