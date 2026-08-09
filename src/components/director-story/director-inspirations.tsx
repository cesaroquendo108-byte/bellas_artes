"use client"

import { SearchX } from "lucide-react"
import { useMemo, useState } from "react"

import type { CreativeProject } from "@/lib/story/contracts"

import { StoryFilters, type StoryFilter } from "./story-filters"
import { StoryVideoCard } from "./story-video-card"

export function DirectorInspirations({ projects }: { projects: CreativeProject[] }) {
  const [filter, setFilter] = useState<StoryFilter>("all")
  const visible = useMemo(() => projects.filter((project) => filter === "all" || project.storyType === filter), [filter, projects])
  return <section className="mt-14 pb-12"><div className="mb-5"><h2 className="text-xl font-semibold text-white">Inspirations</h2><p className="mt-1 text-xs text-slate-600">Historias publicadas por la comunidad.</p></div><StoryFilters value={filter} onChange={setFilter} />{visible.length ? <div className="mt-5 columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4">{visible.map((project) => <div key={project.id} className="mb-5 break-inside-avoid"><StoryVideoCard project={project} /></div>)}</div> : <div className="mt-5 flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 text-center"><SearchX className="size-7 text-slate-700" /><p className="mt-3 text-sm text-slate-400">Todavía no hay inspiraciones publicadas</p><p className="mt-1 text-xs text-slate-600">Sólo aparecerán proyectos comunitarios reales.</p></div>}</section>
}
