"use client"

import Link from "next/link"
import { useMemo, useRef, useState } from "react"
import { AudioLines, Check, Clapperboard, Download, Expand, Film, FolderOpen, ImagePlay, Layers3, Maximize2, Mic2, Orbit, Search, Sparkles, WandSparkles, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { AssetType } from "@/lib/types"

export interface MediaHubAsset {
  id: string
  type: AssetType
  name: string
  signedUrl: string
  createdAt: string
  labels: string[]
  folderId: string | null
}

const tools = [
  { name: "Frame to Video", href: "/video/i2v", icon: ImagePlay, gradient: "from-pink-600 to-violet-700" },
  { name: "Text to Video", href: "/video/t2v", icon: Clapperboard, gradient: "from-violet-600 to-indigo-700" },
  { name: "Edit Video", href: "/video/v2v", icon: Layers3, gradient: "from-indigo-600 to-cyan-700" },
  { name: "VFX", href: "/video/effects", icon: WandSparkles, gradient: "from-rose-600 to-orange-600" },
  { name: "Motion Sync", href: "/video/action-sync", icon: Orbit, gradient: "from-orange-500 to-fuchsia-700" },
  { name: "Lip-Sync", href: "/video/lip-sync", icon: Mic2, gradient: "from-violet-600 to-pink-600" },
  { name: "Upscale Video", href: "/video/upscale", icon: Maximize2, gradient: "from-emerald-600 to-cyan-600" },
  { name: "Replace Character", href: "/video/replace-character", icon: Film, gradient: "from-amber-500 to-violet-700" },
  { name: "Extend Video", href: "/video/extend", icon: Expand, gradient: "from-blue-600 to-violet-700" },
  { name: "Smart Shot", icon: Sparkles, gradient: "from-slate-700 to-violet-800" },
  { name: "Replace Background", icon: ImagePlay, gradient: "from-teal-700 to-slate-800" },
  { name: "Add Sound Effect", icon: AudioLines, gradient: "from-fuchsia-700 to-blue-800" },
]

const filters = [
  { value: "all", label: "All" },
  { value: "unsorted", label: "Unsorted" },
  { value: "labels", label: "Labels" },
  { value: "folders", label: "Folders" },
] as const

type Filter = (typeof filters)[number]["value"]

function download(asset: MediaHubAsset) {
  const anchor = document.createElement("a")
  anchor.href = asset.signedUrl
  anchor.download = asset.name
  anchor.rel = "noopener"
  anchor.click()
}

function AssetPreview({ asset }: { asset: MediaHubAsset }) {
  if (asset.type === "image") return <div role="img" aria-label={asset.name} className="size-full bg-cover bg-center transition duration-500 group-hover:scale-105" style={{ backgroundImage: `url(${asset.signedUrl})` }} />
  if (asset.type === "video") return <video src={asset.signedUrl} muted preload="metadata" className="size-full object-cover transition duration-500 group-hover:scale-105" />
  return <div className="flex size-full items-center justify-center bg-gradient-to-br from-violet-950 to-[#111114]"><AudioLines className="size-9 text-violet-300" /></div>
}

export function MediaHub({ initialAssets, libraryError }: { initialAssets: MediaHubAsset[]; libraryError?: string | null }) {
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<Filter>("all")
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const lastIndex = useRef<number | null>(null)

  const visibleAssets = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("es")
    return initialAssets.filter((asset) => {
      const matchesSearch = !normalizedQuery || asset.name.toLocaleLowerCase("es").includes(normalizedQuery)
      const matchesFilter = filter === "all"
        || (filter === "unsorted" && !asset.folderId && asset.labels.length === 0)
        || (filter === "labels" && asset.labels.length > 0)
        || (filter === "folders" && Boolean(asset.folderId))
      return matchesSearch && matchesFilter
    })
  }, [filter, initialAssets, query])

  function toggleAsset(index: number, shiftKey: boolean) {
    const id = visibleAssets[index]?.id
    if (!id) return
    setSelected((current) => {
      const next = new Set(current)
      const selecting = !next.has(id)
      if (shiftKey && lastIndex.current !== null) {
        const start = Math.min(lastIndex.current, index)
        const end = Math.max(lastIndex.current, index)
        visibleAssets.slice(start, end + 1).forEach((asset) => selecting ? next.add(asset.id) : next.delete(asset.id))
      } else if (selecting) next.add(id)
      else next.delete(id)
      return next
    })
    lastIndex.current = index
  }

  function downloadSelected() {
    initialAssets.filter((asset) => selected.has(asset.id)).forEach(download)
  }

  return (
    <div className="min-h-screen bg-[#080809] px-4 py-8 text-white sm:px-7 lg:px-10">
      <section className="relative overflow-hidden rounded-3xl border border-purple-500/20 bg-gradient-to-r from-purple-950/70 via-[#111114] to-black p-7 sm:p-10">
        <div className="absolute top-[-6rem] right-[-2rem] size-72 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="relative max-w-2xl">
          <Badge className="border border-violet-400/20 bg-white/10 text-violet-100">Media Hub</Badge>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Free AI Video Creation</h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">Accede a tus herramientas y organiza imágenes, videos y audio desde una única biblioteca privada.</p>
          <div className="mt-5 flex flex-wrap gap-2">{["Kling 3.0", "Seedance", "Sora 2", "Veo 3.1"].map((model) => <Badge key={model} variant="outline" className="border-white/10 bg-white/[0.06] text-slate-300">{model}</Badge>)}</div>
          <Button render={<Link href="/video/t2v" />} nativeButton={false} size="lg" className="mt-7 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white"><Clapperboard /> Crear gratis</Button>
        </div>
      </section>

      <section className="mt-10">
        <div className="mb-4"><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-300">Quick starts</p><h2 className="mt-2 text-xl font-semibold">Herramientas de video</h2></div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
          {tools.map(({ name, href, icon: Icon, gradient }) => {
            const content = <><div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-70 transition duration-300 group-hover:scale-110 group-hover:opacity-90`} /><Icon className="absolute top-4 left-4 size-6 text-white/90" /><div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 to-transparent p-3 pt-8"><p className="text-xs font-medium text-white">{name}</p>{!href && <span className="mt-1 block text-[9px] text-slate-400">Próximamente</span>}</div></>
            return href
              ? <Link key={name} href={href} className="group relative aspect-square overflow-hidden rounded-xl border border-white/[0.08] transition hover:border-violet-400/50">{content}</Link>
              : <div key={name} aria-disabled="true" className="group relative aspect-square overflow-hidden rounded-xl border border-white/[0.08] opacity-60">{content}</div>
          })}
        </div>
      </section>

      <section className="mt-12 pb-24">
        <div className="flex flex-col gap-4 border-b border-white/[0.08] pb-4 lg:flex-row lg:items-end lg:justify-between">
          <div><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-300">Your media</p><h2 className="mt-2 text-xl font-semibold">Biblioteca</h2></div>
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row">
            <div className="flex max-w-full gap-1 overflow-x-auto rounded-xl border border-white/[0.08] bg-white/[0.025] p-1">
              {filters.map((item) => <button key={item.value} type="button" onClick={() => { setFilter(item.value); lastIndex.current = null }} className={cn("min-w-fit rounded-lg px-3 py-2 text-[11px] transition", filter === item.value ? "bg-violet-500 text-white" : "text-slate-500 hover:text-white")}>{item.label}</button>)}
            </div>
            <label className="relative min-w-0 sm:w-64"><Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-600" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar assets…" className="w-full border-white/10 bg-white/[0.03] pl-9" /></label>
          </div>
        </div>

        {libraryError && <div className="mt-5 rounded-xl border border-amber-400/20 bg-amber-500/[0.07] p-4 text-xs text-amber-200">{libraryError}</div>}
        {!libraryError && visibleAssets.length > 0 && (
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {visibleAssets.map((asset, index) => {
              const isSelected = selected.has(asset.id)
              return (
                <article key={asset.id} className={cn("group relative cursor-pointer overflow-hidden rounded-xl border bg-[#111114] transition", isSelected ? "border-violet-400 ring-2 ring-violet-400/20" : "border-white/[0.08] hover:border-white/20")} onClick={(event) => toggleAsset(index, event.shiftKey)}>
                  <div className="aspect-square overflow-hidden bg-black"><AssetPreview asset={asset} /></div>
                  <div className="absolute top-2 left-2 flex size-6 items-center justify-center rounded-md border border-white/20 bg-black/70 text-white backdrop-blur" role="checkbox" aria-checked={isSelected}>{isSelected && <Check className="size-3.5" />}</div>
                  <Button type="button" variant="ghost" size="icon-xs" className="absolute top-2 right-2 bg-black/70 text-white opacity-0 backdrop-blur transition group-hover:opacity-100" onClick={(event) => { event.stopPropagation(); download(asset) }} aria-label={`Descargar ${asset.name}`}><Download /></Button>
                  <div className="p-3"><div className="flex items-center gap-2"><Badge variant="outline" className="h-4 border-white/10 px-1 text-[8px] uppercase text-slate-500">{asset.type}</Badge><p className="min-w-0 flex-1 truncate text-[11px] text-slate-300">{asset.name}</p></div></div>
                </article>
              )
            })}
          </div>
        )}
        {!libraryError && visibleAssets.length === 0 && <div className="mt-5 flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 text-center"><FolderOpen className="size-8 text-slate-700" /><p className="mt-4 text-sm font-medium text-slate-400">{initialAssets.length ? "No hay assets con este filtro" : "Tu biblioteca está vacía"}</p><p className="mt-1 text-xs text-slate-600">Los resultados reales aparecerán aquí cuando guardes contenido.</p></div>}
      </section>

      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 z-50 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-2 rounded-full border border-violet-400/20 bg-black/85 p-2 pl-4 shadow-2xl shadow-violet-950/50 backdrop-blur-xl">
          <span className="whitespace-nowrap text-xs text-white">{selected.size} seleccionado{selected.size === 1 ? "" : "s"}</span>
          <Button type="button" size="sm" onClick={downloadSelected} className="rounded-full bg-violet-600 text-white"><Download /> Descargar</Button>
          <Button type="button" variant="ghost" size="icon-sm" className="rounded-full text-slate-400" onClick={() => { setSelected(new Set()); lastIndex.current = null }} aria-label="Limpiar selección"><X /></Button>
        </div>
      )}
    </div>
  )
}
