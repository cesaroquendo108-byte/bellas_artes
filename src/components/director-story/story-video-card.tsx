"use client"

import { Clock3, Play } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import type { CreativeProject } from "@/lib/story/contracts"

function label(value: CreativeProject["storyType"]) { return ({ "music-video": "Music Video", explainer: "Explainer", "character-vlog": "Character Vlog", asmr: "ASMR", custom: "Custom" } as const)[value ?? "custom"] }
function duration(project: CreativeProject) { return project.document.scenes.reduce((total, scene) => total + scene.durationSeconds, 0) }

export function StoryVideoCard({ project }: { project: CreativeProject }) {
  const seconds = Math.round(duration(project)); const display = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`
  return <Dialog><article className="group min-w-0"><DialogTrigger className="block w-full text-left"><div className="relative aspect-video overflow-hidden rounded-xl border border-white/[0.08] bg-gradient-to-br from-violet-950 via-[#15151c] to-black"><div className="absolute inset-0 bg-cover bg-center transition duration-500 group-hover:scale-105" style={project.coverUrl ? { backgroundImage: `url(${project.coverUrl})` } : undefined} /><div className="absolute inset-0 bg-black/20 transition group-hover:bg-black/55" /><Badge className="absolute top-2 left-2 bg-black/70 text-[9px] text-white backdrop-blur">{label(project.storyType)}</Badge><Badge className="absolute right-2 bottom-2 bg-black/80 text-[9px] text-white"><Clock3 className="size-3" />{display}</Badge><span className="absolute inset-0 m-auto flex size-12 items-center justify-center rounded-full bg-violet-600 text-white opacity-0 shadow-lg shadow-violet-500/30 transition group-hover:opacity-100"><Play className="ml-0.5 size-5 fill-current" /></span></div><h3 className="mt-3 line-clamp-2 text-sm font-medium text-slate-300 transition group-hover:text-white">{project.title}</h3></DialogTrigger></article><DialogContent className="max-w-3xl"><DialogHeader><DialogTitle>{project.title}</DialogTitle><DialogDescription>{label(project.storyType)} · {project.document.scenes.length} escenas · {display}</DialogDescription></DialogHeader><div className="mt-4 aspect-video rounded-xl border border-white/10 bg-black bg-contain bg-center bg-no-repeat" style={project.coverUrl ? { backgroundImage: `url(${project.coverUrl})` } : undefined} /><p className="mt-4 text-xs leading-5 text-slate-500">{project.description || "Esta historia no incluye una descripción pública."}</p></DialogContent></Dialog>
}
