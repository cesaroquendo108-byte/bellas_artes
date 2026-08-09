"use client"

import { useState } from "react"

import { Slider } from "@/components/ui/slider"

import { VideoTransportControls } from "./video-transport-controls"

export function VideoTimeline({ duration = 5 }: { duration?: number }) {
  const [playing, setPlaying] = useState(false)
  const [position, setPosition] = useState(0)
  const [muted, setMuted] = useState(false)
  const [loop, setLoop] = useState(false)
  return (
    <div className="rounded-xl border border-white/[0.07] bg-black/50 p-3">
      <Slider value={[position]} min={0} max={duration} step={0.1} onValueChange={(values) => setPosition(Array.isArray(values) ? values[0] : values)} />
      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center">
        <VideoTransportControls playing={playing} muted={muted} loop={loop} onTogglePlay={() => setPlaying((value) => !value)} onToggleMute={() => setMuted((value) => !value)} onToggleLoop={() => setLoop((value) => !value)} onFullscreen={() => document.documentElement.requestFullscreen?.()} />
        <span className="text-[10px] tabular-nums text-slate-500">{position.toFixed(1)}s / {duration}s</span>
      </div>
    </div>
  )
}
