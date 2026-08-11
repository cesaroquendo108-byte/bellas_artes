import Link from "next/link"
import { ArrowRight, AudioLines, BadgePlus, Clapperboard, Expand, Film, ImagePlay, Layers3, Maximize2, Mic2, Orbit, ScanFace, Sparkles, WandSparkles } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CapabilityStatusBadge } from "@/components/landing/capability-status"
import { cn } from "@/lib/utils"
import { SpotlightCard, StatusPill } from "@/components/ui/motion-effects"

import { VIDEO_TOOL_META } from "@/components/video-studio/config"
import type { VideoOperation } from "@/lib/generation/contracts"

const icons: Record<VideoOperation, React.ComponentType<{ className?: string }>> = {
  t2v: Clapperboard,
  i2v: ImagePlay,
  v2v: Layers3,
  "action-sync": Orbit,
  effects: WandSparkles,
  upscale: Maximize2,
  "lip-sync": Mic2,
  "replace-character": ScanFace,
  extend: Expand,
}

const futureTools = [
  { name: "Add Sound Effect", description: "Diseño sonoro generativo", icon: AudioLines },
  { name: "Smart Shot", description: "Reencuadre y montaje inteligente", icon: BadgePlus },
  { name: "Replace Background", description: "Fondos consistentes en movimiento", icon: Film },
]

function ToolCard({ operation }: { operation: VideoOperation }) {
  const tool = VIDEO_TOOL_META[operation]
  const Icon = icons[operation]
  return (
    <SpotlightCard className="min-h-52 rounded-2xl" contentClassName="p-5"><Link href={`/video/${operation}`} className="group relative block size-full">
      <div className={`absolute inset-x-0 top-0 h-28 bg-gradient-to-br ${tool.accent} opacity-15 blur-2xl transition group-hover:opacity-25`} />
      <div className={cn("relative flex size-11 items-center justify-center rounded-xl bg-gradient-to-br shadow-lg", tool.accent)}><Icon className="size-5 text-white" /></div>
      <div className="relative mt-7">
        <div className="flex items-center gap-2"><h3 className="text-sm font-semibold text-white">{tool.title}</h3><ArrowRight className="size-3.5 -translate-x-1 text-violet-300 opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100" /></div>
        <p className="mt-2 text-xs leading-5 text-slate-500">{tool.description}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2"><CapabilityStatusBadge status="beta" /><StatusPill state="preparing" tone="warning" /></div>
      </div>
    </Link></SpotlightCard>
  )
}

export function VideoHub() {
  const createTools = (Object.keys(VIDEO_TOOL_META) as VideoOperation[]).filter((operation) => VIDEO_TOOL_META[operation].category === "create")
  const editTools = (Object.keys(VIDEO_TOOL_META) as VideoOperation[]).filter((operation) => VIDEO_TOOL_META[operation].category === "edit")

  return (
    <div className="min-h-screen bg-[#080809] px-4 py-8 text-white sm:px-7 lg:px-10">
      <section className="relative overflow-hidden rounded-3xl border border-violet-400/20 bg-[#111114] px-6 py-9 sm:px-10 sm:py-12">
        <div className="absolute -top-32 right-[-8%] size-80 rounded-full bg-violet-600/25 blur-3xl" />
        <div className="absolute -bottom-40 left-[30%] size-72 rounded-full bg-fuchsia-600/15 blur-3xl" />
        <div className="relative max-w-3xl">
          <Badge className="border border-violet-400/20 bg-violet-500/10 text-violet-200"><Sparkles className="size-3" /> Suite de video</Badge>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-5xl">Del primer frame al corte final.</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">Crea, transforma y mejora video desde un conjunto de estudios especializados, con un flujo visual consistente y preparado para conectar modelos reales.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button render={<Link href="/video/t2v" />} nativeButton={false} size="lg" className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-xl shadow-violet-700/20"><WandSparkles /> Crear video</Button>
            <Button render={<Link href="/media" />} nativeButton={false} variant="outline" size="lg" className="border-white/10 bg-white/[0.04] text-slate-200">Abrir centro de medios</Button>
          </div>
        </div>
        <div className="relative mt-8 flex flex-wrap gap-2">
          {["HunyuanVideo 8.3B · En preparación", "HunyuanVideo 13B · Pro/B2B"].map((model) => <Badge key={model} variant="outline" className="border-white/10 bg-black/20 text-slate-400">{model}</Badge>)}
        </div>
      </section>

      <section className="mt-12">
        <div className="mb-5"><p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-300">Crear video</p><h2 className="mt-2 text-xl font-semibold">Empieza con una idea o una referencia</h2></div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{createTools.map((operation) => <ToolCard key={operation} operation={operation} />)}</div>
      </section>

      <section className="mt-12">
        <div className="mb-5"><p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-fuchsia-300">Editar video</p><h2 className="mt-2 text-xl font-semibold">Refina cada capa de tu metraje</h2></div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{editTools.map((operation) => <ToolCard key={operation} operation={operation} />)}</div>
      </section>

      <section className="mt-12 rounded-3xl border border-white/[0.08] bg-white/[0.025] p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div><Badge variant="outline" className="border-pink-400/20 text-pink-300">Novedades</Badge><h2 className="mt-3 text-xl font-semibold">Más herramientas en preparación</h2><p className="mt-2 max-w-xl text-xs leading-5 text-slate-500">Estas superficies pertenecen a fases posteriores. Permanecen visibles para anticipar el ecosistema, sin rutas ni integraciones ficticias.</p></div>
          <div className="grid gap-3 sm:grid-cols-3">
            {futureTools.map(({ name, description, icon: Icon }) => <div key={name} className="rounded-xl border border-white/[0.07] bg-black/20 p-4"><Icon className="size-4 text-slate-500" /><p className="mt-3 text-xs font-medium text-slate-300">{name}</p><p className="mt-1 text-[10px] text-slate-600">{description}</p><Badge variant="outline" className="mt-3 border-white/10 text-[9px] text-slate-600">Próximamente</Badge></div>)}
          </div>
        </div>
      </section>
    </div>
  )
}
