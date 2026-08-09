"use client"

import { Clock3, Film, FolderOpen, ImageIcon, Music2, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"

import type { MediaSlot, StudioAsset } from "./types"
import { useVideoStudio } from "./video-studio-context"

function preferredSlot(operation: string, type: StudioAsset["type"]): MediaSlot | null {
  if (type === "video") return operation === "action-sync" ? "motionVideo" : "sourceVideo"
  if (type === "audio") return "audio"
  if (operation === "action-sync" || operation === "replace-character") return "characterImage"
  return "sourceImage"
}

export function VideoHistoryGrid({ assets }: { assets: StudioAsset[] }) {
  const { state, selectSavedAsset } = useVideoStudio()

  return (
    <aside className="min-h-0 border-l border-white/[0.07] bg-[#0b0b0d] lg:flex lg:flex-col">
      <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3">
        <div><h2 className="text-xs font-semibold text-white">Biblioteca e historial</h2><p className="mt-0.5 text-[10px] text-slate-600">Assets reales disponibles</p></div>
        <Clock3 className="size-4 text-slate-600" />
      </div>
      <div className="grid max-h-80 grid-cols-2 gap-2 overflow-y-auto p-3 lg:max-h-none lg:flex-1 lg:grid-cols-1 xl:grid-cols-2">
        {assets.map((asset) => {
          const Icon = asset.type === "video" ? Film : asset.type === "image" ? ImageIcon : Music2
          const slot = preferredSlot(state.operation, asset.type)
          return (
            <article key={asset.id} className="group overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.025] transition hover:border-violet-400/30">
              <div className="relative aspect-video overflow-hidden bg-black/70">
                {asset.type === "image" && <div role="img" aria-label={asset.name} className="size-full bg-cover bg-center transition duration-500 group-hover:scale-105" style={{ backgroundImage: `url(${asset.signedUrl})` }} />}
                {asset.type === "video" && <video src={asset.signedUrl} muted preload="metadata" className="size-full object-cover" />}
                {asset.type === "audio" && <div className="flex size-full items-center justify-center"><Music2 className="size-7 text-violet-300" /></div>}
                <Icon className="absolute top-2 left-2 size-3.5 text-white drop-shadow" />
              </div>
              <div className="p-2">
                <p className="truncate text-[10px] font-medium text-slate-300">{asset.name}</p>
                <Button type="button" variant="ghost" size="xs" className="mt-1 h-6 w-full text-[10px] text-violet-300" disabled={!slot} onClick={() => slot && selectSavedAsset(slot, asset)}>
                  <Plus className="size-3" /> Usar asset
                </Button>
              </div>
            </article>
          )
        })}
        {assets.length === 0 && (
          <div className="col-span-full flex min-h-44 flex-col items-center justify-center rounded-xl border border-dashed border-white/10 px-5 text-center">
            <FolderOpen className="size-6 text-slate-700" />
            <p className="mt-3 text-xs font-medium text-slate-400">Biblioteca vacía</p>
            <p className="mt-1 text-[10px] leading-4 text-slate-600">Puedes usar archivos locales para diseñar el estudio. Para enviar la generación harán falta assets guardados.</p>
          </div>
        )}
      </div>
    </aside>
  )
}
