"use client"

import Link from "next/link"
import { ArrowLeft, SlidersHorizontal } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { VIDEO_TOOL_META } from "./config"
import { useVideoStudio } from "./video-studio-context"

const primaryStudios = ["t2v", "i2v", "v2v"] as const

export function VideoStudioHeader({ onOpenControls }: { onOpenControls: () => void }) {
  const { state } = useVideoStudio()
  const meta = VIDEO_TOOL_META[state.operation]

  return (
    <header className="border-b border-white/[0.07] bg-[#0b0b0d]/95 px-3 py-3 backdrop-blur-xl sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <Button render={<Link href="/video" />} nativeButton={false} variant="ghost" size="icon-sm" aria-label="Volver a Video Hub">
          <ArrowLeft className="size-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-semibold text-white sm:text-base">{meta.title}</h1>
          <p className="hidden truncate text-[11px] text-slate-500 sm:block">{meta.description}</p>
        </div>
        <nav aria-label="Estudios principales" className="hidden items-center rounded-lg border border-white/[0.08] bg-white/[0.025] p-1 md:flex">
          {primaryStudios.map((operation) => (
            <Link
              key={operation}
              href={`/video/${operation}`}
              className={cn(
                "rounded-md px-3 py-1.5 text-[11px] font-medium transition",
                state.operation === operation ? "bg-violet-500 text-white shadow-lg shadow-violet-500/20" : "text-slate-500 hover:text-white"
              )}
            >
              {VIDEO_TOOL_META[operation].shortTitle}
            </Link>
          ))}
        </nav>
        <Button type="button" size="sm" onClick={onOpenControls} aria-label="Abrir controles" className="bg-violet-600 text-white hover:bg-violet-500 lg:hidden">
          <SlidersHorizontal className="size-4" />
          <span className="hidden sm:inline">Controles</span>
        </Button>
      </div>
    </header>
  )
}
