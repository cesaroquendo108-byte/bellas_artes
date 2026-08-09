"use client"

import { Maximize2, Pause, Play, Repeat2, Volume2, VolumeX } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function VideoTransportControls({ playing, muted, loop, onTogglePlay, onToggleMute, onToggleLoop, onFullscreen }: {
  playing: boolean
  muted: boolean
  loop: boolean
  onTogglePlay: () => void
  onToggleMute: () => void
  onToggleLoop: () => void
  onFullscreen: () => void
}) {
  return (
    <div className="flex items-center gap-1">
      <Button type="button" variant="ghost" size="icon-sm" onClick={onTogglePlay} aria-label={playing ? "Pausar" : "Reproducir"}>{playing ? <Pause /> : <Play />}</Button>
      <Button type="button" variant="ghost" size="icon-sm" onClick={onToggleLoop} aria-label="Repetir" aria-pressed={loop} className={cn(loop && "text-violet-300")}><Repeat2 /></Button>
      <Button type="button" variant="ghost" size="icon-sm" onClick={onToggleMute} aria-label={muted ? "Activar volumen" : "Silenciar"}>{muted ? <VolumeX /> : <Volume2 />}</Button>
      <Button type="button" variant="ghost" size="icon-sm" className="ml-auto" onClick={onFullscreen} aria-label="Pantalla completa"><Maximize2 /></Button>
    </div>
  )
}
