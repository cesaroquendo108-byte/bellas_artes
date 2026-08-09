"use client"

import Link from "next/link"
import { Plus, Search, SearchX } from "lucide-react"
import { useMemo, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { CreativeProject, CreativeProjectStatus } from "@/lib/story/contracts"
import { cn } from "@/lib/utils"

import { DirectorProjectCard } from "./director-project-card"

type Filter = "all" | Extract<CreativeProjectStatus, "draft" | "completed" | "archived">
const filters: { value: Filter; label: string }[] = [{ value: "all", label: "All" }, { value: "draft", label: "Draft" }, { value: "completed", label: "Completed" }, { value: "archived", label: "Archived" }]

export function DirectorProjects({ projects, error }: { projects: CreativeProject[]; error?: string | null }) {
  const [filter, setFilter] = useState<Filter>("all"); const [query, setQuery] = useState("")
  const visible = useMemo(() => projects.filter((project) => (filter === "all" || project.status === filter) && (!query.trim() || project.title.toLowerCase().includes(query.trim().toLowerCase()))), [filter, projects, query])
  return <div className="min-h-screen bg-[#080809] px-4 py-8 text-white sm:px-7 lg:px-10"><header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><Badge className="border border-violet-400/20 bg-violet-500/10 text-violet-200">Director</Badge><h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Director Projects</h1><p className="mt-2 text-sm text-slate-500">Gestiona proyectos narrativos persistentes.</p></div><Button render={<Link href="/story/create?kind=director" />} nativeButton={false} size="lg" className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white"><Plus /> Create New Project</Button></header><div className="mt-8 flex flex-col gap-4 border-y border-white/[0.07] py-4 lg:flex-row lg:items-center lg:justify-between"><div className="flex max-w-full gap-2 overflow-x-auto">{filters.map((item) => <button key={item.value} type="button" onClick={() => setFilter(item.value)} className={cn("min-w-fit rounded-full border px-4 py-2 text-xs", filter === item.value ? "border-violet-400 bg-violet-600 text-white" : "border-white/10 text-slate-500")}>{item.label}</button>)}</div><label className="relative block w-full lg:w-72"><Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-600" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar proyecto…" className="pl-9" /></label></div>{error && <div className="mt-6 rounded-xl border border-amber-400/20 bg-amber-500/[0.08] p-4 text-xs text-amber-200">{error}</div>}{visible.length ? <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{visible.map((project) => <DirectorProjectCard key={project.id} project={project} />)}</div> : <div className="mt-6 flex min-h-[50vh] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 text-center"><SearchX className="size-8 text-slate-700" /><h2 className="mt-4 text-base font-medium text-slate-300">No hay proyectos con estos filtros</h2><p className="mt-2 max-w-sm text-xs leading-5 text-slate-600">Crea tu primer proyecto Director o modifica la búsqueda.</p><Button render={<Link href="/story/create?kind=director" />} nativeButton={false} className="mt-5 bg-violet-600 text-white"><Plus /> Crear proyecto</Button></div>}</div>
}
