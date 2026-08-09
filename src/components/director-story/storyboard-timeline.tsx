"use client"

import { Clock3, Film } from "lucide-react"

import { useStoryProject } from "./story-project-context"

export function StoryboardTimeline() {
  const { state } = useStoryProject(); const total = state.document.scenes.reduce((sum, scene) => sum + scene.durationSeconds, 0)
  return <div className="min-h-[55vh] rounded-2xl border border-white/[0.08] bg-[#0d0d10] p-4 sm:p-6"><div className="flex items-center gap-2"><Clock3 className="size-4 text-violet-300" /><h2 className="text-sm font-semibold">Timeline</h2><span className="ml-auto text-xs text-slate-500">{total.toFixed(1)} segundos</span></div>{state.document.scenes.length ? <div className="mt-8 space-y-5">{state.document.scenes.map((scene, index) => <div key={scene.id}><div className="mb-2 flex items-center gap-2 text-[10px]"><span className="text-violet-300">Scene {index + 1}</span><span className="text-slate-500">{scene.title}</span><span className="ml-auto text-slate-600">{scene.durationSeconds.toFixed(1)}s</span></div><div className="flex min-h-16 gap-1 overflow-x-auto rounded-xl border border-white/[0.06] bg-black/30 p-2">{scene.shots.map((shot) => <div key={shot.id} className="relative min-w-24 flex-1 overflow-hidden rounded-lg border border-violet-400/20 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/5 p-2" style={{ flexGrow: Math.max(1, shot.durationSeconds) }}><Film className="size-3 text-violet-300" /><p className="mt-2 truncate text-[9px] text-slate-300">{shot.title}</p><p className="text-[8px] text-slate-600">{shot.durationSeconds}s</p></div>)}</div></div>)}</div> : <div className="flex min-h-80 items-center justify-center text-xs text-slate-600">Añade escenas para construir la línea de tiempo.</div>}</div>
}
