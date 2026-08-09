"use client"

import { FolderOpen, ImageIcon, RotateCcw, Search, Sparkles } from "lucide-react"
import { useMemo, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

import type { ImageGalleryAsset } from "./types"

const filters = ["Unsorted", "Labels", "Folders", "Templates", "All"] as const
type GalleryFilter = (typeof filters)[number]

interface ImageGalleryProps {
  assets: ImageGalleryAsset[]
  error: string | null
  onRecreate: (asset: ImageGalleryAsset) => void
}

export function ImageGallery({ assets, error, onRecreate }: ImageGalleryProps) {
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<GalleryFilter>("All")

  const filteredAssets = useMemo(() => {
    if (!["All", "Unsorted"].includes(filter)) return []
    const normalizedQuery = query.trim().toLocaleLowerCase("es-VE")
    if (!normalizedQuery) return assets
    return assets.filter((asset) => asset.name.toLocaleLowerCase("es-VE").includes(normalizedQuery))
  }, [assets, filter, query])

  return (
    <section className="min-w-0 bg-[#0a0a0a] lg:h-full lg:overflow-y-auto">
      <div className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#0a0a0a]/90 px-4 py-4 backdrop-blur-xl sm:px-6">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold tracking-tight text-white">Your visual library</h2>
              <Badge variant="outline" className="border-violet-400/20 bg-violet-500/[0.08] text-violet-200">{assets.length}</Badge>
            </div>
            <p className="mt-1 text-xs text-slate-500">Tus imágenes guardadas, listas para volver a crear.</p>
          </div>
          <div className="relative w-full xl:max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-slate-500" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search creations"
              className="h-9 border-white/10 bg-white/[0.035] pl-9 text-xs"
            />
          </div>
        </div>

        <div className="mt-4 flex gap-1 overflow-x-auto pb-1" aria-label="Filtros de galería">
          {filters.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item)}
              className={cn(
                "shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-medium transition-colors",
                filter === item ? "bg-white text-black" : "bg-white/[0.04] text-slate-400 hover:bg-white/[0.08] hover:text-white"
              )}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 sm:p-6">
        {error && (
          <div className="mb-5 flex gap-3 rounded-xl border border-amber-400/20 bg-amber-500/[0.08] p-4 text-xs leading-5 text-amber-100">
            <FolderOpen className="mt-0.5 size-4 shrink-0 text-amber-300" />
            <div>
              <p className="font-medium">La biblioteca no pudo conectarse</p>
              <p className="mt-0.5 text-amber-200/60">{error}</p>
            </div>
          </div>
        )}

        {filteredAssets.length > 0 ? (
          <div className="columns-1 gap-4 sm:columns-2 xl:columns-3">
            {filteredAssets.map((asset, index) => (
              <article key={asset.id} className="group relative mb-4 break-inside-avoid overflow-hidden rounded-2xl bg-[#151518] ring-1 ring-white/[0.07]">
                <div
                  role="img"
                  aria-label={asset.name}
                  className={cn("w-full bg-cover bg-center transition duration-500 group-hover:scale-[1.02]", index % 3 === 0 ? "aspect-[4/5]" : index % 3 === 1 ? "aspect-square" : "aspect-[3/4]")}
                  style={{ backgroundImage: `url(${asset.signedUrl})` }}
                />
                <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/90 via-black/10 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                  <p className="truncate text-xs font-medium text-white">{asset.name}</p>
                  <p className="mt-0.5 text-[10px] text-white/50">{new Intl.DateTimeFormat("es-VE", { dateStyle: "medium" }).format(new Date(asset.createdAt))}</p>
                  <Button type="button" size="sm" className="mt-3 w-full bg-white text-black hover:bg-slate-100" onClick={() => onRecreate(asset)}>
                    <RotateCcw className="size-3.5" /> Recreate
                  </Button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyGallery hasAssets={assets.length > 0} filter={filter} query={query} />
        )}
      </div>
    </section>
  )
}

function EmptyGallery({ hasAssets, filter, query }: { hasAssets: boolean; filter: GalleryFilter; query: string }) {
  const isFiltered = hasAssets && (Boolean(query.trim()) || !["All", "Unsorted"].includes(filter))
  return (
    <div className="flex min-h-[420px] items-center justify-center rounded-3xl border border-dashed border-white/[0.09] bg-gradient-to-b from-white/[0.025] to-transparent px-6 text-center">
      <div className="max-w-sm">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-500/10 shadow-2xl shadow-violet-500/10">
          {isFiltered ? <Search className="size-6 text-violet-300" /> : <ImageIcon className="size-6 text-violet-300" />}
        </div>
        <h3 className="mt-5 text-base font-semibold text-white">{isFiltered ? "No encontramos coincidencias" : "Tu biblioteca visual empieza aquí"}</h3>
        <p className="mt-2 text-xs leading-5 text-slate-500">
          {isFiltered ? "Prueba otro término o vuelve al filtro All." : "Cuando conectemos el motor de generación, tus imágenes reales aparecerán en este espacio."}
        </p>
        {!isFiltered && <div className="mt-4 inline-flex items-center gap-1.5 text-[10px] font-medium text-violet-300"><Sparkles className="size-3" /> Sin resultados simulados</div>}
      </div>
    </div>
  )
}
