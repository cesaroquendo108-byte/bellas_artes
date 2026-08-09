"use client"

import { ImagePlus, Palette, Trash2, Upload, UsersRound, X } from "lucide-react"
import { useId, useState } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import type {
  LocalReference,
  LocalReferences,
  ReferenceCategory,
  SelectedReferenceAsset,
} from "./types"

const MAX_FILE_SIZE = 30 * 1024 * 1024
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])

const dropzones: Array<{
  category: ReferenceCategory
  title: string
  description: string
  icon: typeof UsersRound
}> = [
  { category: "characters", title: "From references", description: "Personajes y sujetos", icon: UsersRound },
  { category: "brandKit", title: "From Brand Kit", description: "Colores y marca", icon: Palette },
  { category: "visual", title: "Visual references", description: "Estilo y composición", icon: ImagePlus },
]

interface ImageReferenceDropzonesProps {
  references: LocalReferences
  selectedAsset: SelectedReferenceAsset | null
  onAddFiles: (category: ReferenceCategory, files: File[]) => void
  onRemoveFile: (category: ReferenceCategory, id: string) => void
  onRemoveSelectedAsset: () => void
}

export function ImageReferenceDropzones({
  references,
  selectedAsset,
  onAddFiles,
  onRemoveFile,
  onRemoveSelectedAsset,
}: ImageReferenceDropzonesProps) {
  const inputPrefix = useId()
  const [dragging, setDragging] = useState<ReferenceCategory | null>(null)
  const [error, setError] = useState<string | null>(null)

  function validateFiles(files: File[]) {
    const accepted = files.filter((file) => ACCEPTED_TYPES.has(file.type) && file.size <= MAX_FILE_SIZE)
    if (accepted.length !== files.length) {
      setError("Algunos archivos se omitieron. Usa JPEG, PNG o WEBP de hasta 30 MB.")
    } else {
      setError(null)
    }
    return accepted
  }

  function submitFiles(category: ReferenceCategory, files: File[]) {
    const accepted = validateFiles(files)
    if (accepted.length) onAddFiles(category, accepted)
  }

  return (
    <div className="space-y-3">
      {selectedAsset && (
        <div className="flex items-center gap-3 rounded-xl border border-violet-400/25 bg-violet-500/10 p-2.5">
          <div
            role="img"
            aria-label={selectedAsset.name}
            className="size-11 shrink-0 rounded-lg bg-cover bg-center ring-1 ring-white/10"
            style={{ backgroundImage: `url(${selectedAsset.signedUrl})` }}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-violet-100">Referencia guardada</p>
            <p className="truncate text-[11px] text-violet-200/60">{selectedAsset.name}</p>
          </div>
          <Button type="button" variant="ghost" size="icon-sm" onClick={onRemoveSelectedAsset} aria-label="Quitar referencia guardada">
            <X className="size-3.5" />
          </Button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        {dropzones.map(({ category, title, description, icon: Icon }) => {
          const inputId = `${inputPrefix}-${category}`
          return (
            <div key={category} className="min-w-0">
              <input
                id={inputId}
                className="sr-only"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={(event) => {
                  submitFiles(category, Array.from(event.target.files ?? []))
                  event.target.value = ""
                }}
              />
              <label
                htmlFor={inputId}
                className={cn(
                  "flex h-24 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-white/15 bg-white/[0.025] px-1.5 text-center transition hover:border-violet-400/50 hover:bg-violet-500/[0.07]",
                  dragging === category && "border-violet-400 bg-violet-500/10"
                )}
                onDragEnter={(event) => {
                  event.preventDefault()
                  setDragging(category)
                }}
                onDragOver={(event) => event.preventDefault()}
                onDragLeave={() => setDragging(null)}
                onDrop={(event) => {
                  event.preventDefault()
                  setDragging(null)
                  submitFiles(category, Array.from(event.dataTransfer.files))
                }}
              >
                <Icon className="mb-2 size-4 text-violet-300" />
                <span className="line-clamp-1 text-[10px] font-semibold text-slate-200">{title}</span>
                <span className="mt-0.5 line-clamp-1 text-[9px] text-slate-500">{description}</span>
              </label>
            </div>
          )
        })}
      </div>

      {Object.entries(references).some(([, items]) => items.length > 0) && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(Object.entries(references) as Array<[ReferenceCategory, LocalReference[]]>).flatMap(([category, items]) =>
            items.map((item) => (
              <div key={item.id} className="group relative size-14 shrink-0 overflow-hidden rounded-lg ring-1 ring-white/10">
                <div className="size-full bg-cover bg-center" style={{ backgroundImage: `url(${item.previewUrl})` }} />
                <button
                  type="button"
                  className="absolute inset-0 flex items-center justify-center bg-black/70 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
                  onClick={() => onRemoveFile(category, item.id)}
                  aria-label={`Eliminar ${item.name}`}
                >
                  <Trash2 className="size-4 text-white" />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
        <Upload className="size-3" />
        JPEG, PNG o WEBP · máximo 30 MB
      </div>
      {error && <p role="alert" className="text-[11px] leading-4 text-rose-300">{error}</p>}
    </div>
  )
}
