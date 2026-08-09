"use client"

import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

import { useVideoStudio } from "./video-studio-context"

const presets = [
  { value: "cinematic", label: "Cinematic", gradient: "from-amber-700 to-slate-900" },
  { value: "anime", label: "Anime", gradient: "from-pink-600 to-cyan-600" },
  { value: "film-noir", label: "Film Noir", gradient: "from-slate-300 to-black" },
  { value: "editorial", label: "Editorial", gradient: "from-violet-700 to-rose-500" },
]

export function VideoStylePresets() {
  const { state, setField } = useVideoStudio()
  return (
    <div className="space-y-2">
      <p className="text-[11px] text-slate-400">Estilo visual</p>
      <div className="grid grid-cols-2 gap-2">
        {presets.map((preset) => {
          const selected = state.fields.stylePreset === preset.value
          return (
            <button key={preset.value} type="button" onClick={() => setField("stylePreset", preset.value)} className={cn("relative overflow-hidden rounded-lg border p-2 text-left transition", selected ? "border-violet-400/60 bg-violet-500/10" : "border-white/[0.08] bg-white/[0.02] hover:border-white/20")}>
              <span className={`mb-2 block h-8 rounded-md bg-gradient-to-br ${preset.gradient}`} />
              <span className="text-[10px] text-slate-300">{preset.label}</span>
              {selected && <Check className="absolute top-2 right-2 size-3.5 rounded-full bg-violet-500 p-0.5 text-white" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
