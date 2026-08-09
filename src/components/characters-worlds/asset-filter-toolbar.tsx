"use client"

import { Search } from "lucide-react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

import type { LibraryFilter } from "./types"

const filters: { value: LibraryFilter; label: string }[] = [
  { value: "unsorted", label: "Unsorted" }, { value: "labels", label: "Labels" }, { value: "folders", label: "Folders" }, { value: "templates", label: "Templates" }, { value: "all", label: "All" },
]

export function AssetFilterToolbar({ filter, onFilterChange, query, onQueryChange }: { filter: LibraryFilter; onFilterChange: (value: LibraryFilter) => void; query: string; onQueryChange: (value: string) => void }) {
  return (
    <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="flex max-w-full gap-1 overflow-x-auto rounded-xl border border-white/[0.08] bg-white/[0.025] p-1">
        {filters.map((item) => <button key={item.value} type="button" onClick={() => onFilterChange(item.value)} className={cn("min-w-fit rounded-lg px-3 py-2 text-[11px] transition", filter === item.value ? "bg-violet-500 text-white" : "text-slate-500 hover:text-white")}>{item.label}</button>)}
      </div>
      <label className="relative min-w-0 md:w-72"><Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-600" /><Input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Buscar recursos…" className="w-full border-white/10 bg-white/[0.03] pl-9" /></label>
    </div>
  )
}
