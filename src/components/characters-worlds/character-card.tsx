"use client"

import Link from "next/link"
import { Copy, MoreHorizontal, Pencil, Play, RotateCcw, Trash2, Video } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

import type { CharacterWorldAsset } from "./types"

export function CharacterCard({ asset, onUnavailableAction }: { asset: CharacterWorldAsset; onUnavailableAction: (message: string) => void }) {
  return (
    <Dialog>
      <article className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#121214] transition duration-300 hover:border-violet-400/40 hover:shadow-xl hover:shadow-violet-950/30">
        <DialogTrigger className="block w-full text-left">
          <div className="relative aspect-[3/4] overflow-hidden bg-black">
            <div role="img" aria-label={asset.name} className="size-full bg-cover bg-center transition duration-500 group-hover:scale-105" style={{ backgroundImage: `url(${asset.signedUrl})` }} />
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/65 opacity-0 backdrop-blur-[2px] transition group-hover:opacity-100">
              <span className="rounded-full bg-violet-600 px-3 py-2 text-[10px] font-medium text-white"><Play className="mr-1 inline size-3" /> Ver personaje</span>
            </div>
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/70 to-transparent p-3 pt-10"><h3 className="truncate text-sm font-semibold text-white">{asset.name}</h3><p className="mt-1 truncate text-[10px] text-slate-400">{asset.style ?? (asset.labels.join(" · ") || "Personaje")}</p></div>
          </div>
        </DialogTrigger>
        <div className="flex items-center gap-2 p-3">
          <Badge variant="outline" className="border-violet-400/20 text-[9px] text-violet-300">{asset.model ?? "Character"}</Badge>
          <span className="min-w-0 flex-1 truncate text-[10px] text-slate-600">{asset.ageRange ?? "Sin clasificar"}</span>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button type="button" variant="ghost" size="icon-sm" />}><MoreHorizontal /><span className="sr-only">Acciones de {asset.name}</span></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem render={<Link href={`/characters/create?reference=${asset.id}`} />}><RotateCcw /> Reusar personaje</DropdownMenuItem>
              <DropdownMenuItem render={<Link href={`/characters/create?reference=${asset.id}`} />}><Pencil /> Editar</DropdownMenuItem>
              <DropdownMenuItem render={<Link href="/video/i2v" />}><Video /> Exportar a video</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onUnavailableAction("La duplicación se habilitará con la persistencia de personajes.")}><Copy /> Duplicar</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onUnavailableAction("La eliminación de entidades no forma parte de esta fase.")} className="text-rose-300"><Trash2 /> Eliminar</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </article>
      <DialogContent className="max-w-3xl">
        <DialogHeader><DialogTitle>{asset.name}</DialogTitle><DialogDescription>Detalle del asset real y metadata disponible.</DialogDescription></DialogHeader>
        <div className="mt-5 grid gap-5 md:grid-cols-[minmax(0,1fr)_260px]">
          <div className="aspect-[3/4] overflow-hidden rounded-xl bg-black"><div className="size-full bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url(${asset.signedUrl})` }} /></div>
          <div className="space-y-4 text-xs">
            <div><p className="text-slate-500">Modelo</p><p className="mt-1 text-slate-200">{asset.model ?? "No registrado"}</p></div>
            <div><p className="text-slate-500">Prompt</p><p className="mt-1 leading-5 text-slate-300">{asset.prompt ?? "No hay prompt guardado en la metadata."}</p></div>
            <div><p className="text-slate-500">Seed</p><p className="mt-1 text-slate-200">{asset.seed ?? "No registrada"}</p></div>
            <div><p className="text-slate-500">Escenas</p><p className="mt-1 text-slate-200">No registradas en la metadata.</p></div>
            <div><p className="text-slate-500">Poses</p><p className="mt-1 text-slate-200">No registradas en la metadata.</p></div>
            <div className="flex flex-wrap gap-1">{asset.labels.map((label) => <Badge key={label} variant="outline" className="border-white/10 text-slate-400">{label}</Badge>)}</div>
            <Button render={<Link href={`/characters/create?reference=${asset.id}`} />} nativeButton={false} className="w-full bg-violet-600 text-white">Usar en Character Builder</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
