"use client"

import { FolderOpen, ImagePlus, Trash2 } from "lucide-react"
import { useId, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { useCharacterBuilder } from "./character-builder-context"
import type { CharacterWorldAsset } from "./types"

export function CharacterReferenceUpload({ assets }: { assets: CharacterWorldAsset[] }) {
  const id = useId()
  const [error, setError] = useState<string | null>(null)
  const { state, setLocalReference, setSavedReference } = useCharacterBuilder()
  const imageAssets = assets.filter((asset) => asset.type === "image")
  const preview = state.localReference?.previewUrl ?? state.savedReference?.signedUrl

  function choose(file?: File) {
    if (!file) return
    if (!file.type.startsWith("image/") || file.size > 30 * 1024 * 1024) { setError("Usa JPEG, PNG o WEBP de hasta 30 MB."); return }
    setError(null); setLocalReference(file)
  }

  if (preview) return <div className="overflow-hidden rounded-xl border border-violet-400/20 bg-violet-500/[0.06]"><div className="relative aspect-square bg-cover bg-center" style={{ backgroundImage: `url(${preview})` }}><Badge className="absolute top-2 left-2 border border-white/10 bg-black/70 text-[9px]">{state.localReference ? "Preview local" : "Asset guardado"}</Badge></div><div className="flex items-center gap-2 p-2"><span className="min-w-0 flex-1 truncate text-[10px] text-slate-400">{state.localReference?.file.name ?? state.savedReference?.name}</span><Button type="button" variant="ghost" size="icon-sm" onClick={() => state.localReference ? setLocalReference() : setSavedReference()}><Trash2 /></Button></div></div>

  return <div className="space-y-2"><input id={id} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { choose(event.target.files?.[0]); event.target.value = "" }} /><label htmlFor={id} className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-white/15 bg-white/[0.025] p-4 text-center transition hover:border-violet-400/50 hover:bg-violet-500/[0.05]"><ImagePlus className="size-6 text-violet-300" /><span className="mt-2 text-xs text-slate-300">Referencia facial</span><span className="mt-1 text-[10px] text-slate-600">JPEG, PNG o WEBP · 30 MB</span></label>{imageAssets.length > 0 && <Select value={null} onValueChange={(assetId) => setSavedReference(imageAssets.find((asset) => asset.id === assetId))}><SelectTrigger className="h-8 w-full border-white/10 bg-white/[0.03] text-[10px]"><FolderOpen className="size-3.5" /><SelectValue placeholder="Elegir de biblioteca" /></SelectTrigger><SelectContent>{imageAssets.map((asset) => <SelectItem key={asset.id} value={asset.id}>{asset.name}</SelectItem>)}</SelectContent></Select>}{error && <p role="alert" className="text-[10px] text-rose-300">{error}</p>}</div>
}
