"use client"

import type { StoryTemplate } from "@/lib/story/contracts"
import { cn } from "@/lib/utils"

export type StoryFilter = "all" | StoryTemplate

const filters: { value: StoryFilter; label: string }[] = [{ value: "all", label: "All" }, { value: "music-video", label: "Music Video" }, { value: "character-vlog", label: "Character Vlog" }, { value: "explainer", label: "Explainer Video" }, { value: "asmr", label: "ASMR Video" }, { value: "custom", label: "Create from Scratch" }]

export function StoryFilters({ value, onChange }: { value: StoryFilter; onChange: (value: StoryFilter) => void }) {
  return <div className="flex max-w-full gap-2 overflow-x-auto pb-2">{filters.map((filter) => <button key={filter.value} type="button" onClick={() => onChange(filter.value)} className={cn("min-w-fit rounded-full border px-4 py-2 text-xs transition", value === filter.value ? "border-violet-400 bg-violet-600 text-white" : "border-white/[0.08] bg-white/[0.035] text-slate-500 hover:bg-white/[0.07] hover:text-white")}>{filter.label}</button>)}</div>
}
