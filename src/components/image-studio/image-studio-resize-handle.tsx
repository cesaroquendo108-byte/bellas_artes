"use client"

import { GripVertical } from "lucide-react"
import { useRef } from "react"

interface ImageStudioResizeHandleProps {
  width: number
  onWidthChange: (width: number) => void
}

const MIN_WIDTH = 320
const MAX_WIDTH = 480

function clampWidth(width: number) {
  return Math.min(Math.max(width, MIN_WIDTH), MAX_WIDTH)
}

export function ImageStudioResizeHandle({ width, onWidthChange }: ImageStudioResizeHandleProps) {
  const dragState = useRef<{ startX: number; startWidth: number } | null>(null)

  return (
    <div
      role="separator"
      aria-label="Redimensionar panel de controles"
      aria-orientation="vertical"
      aria-valuemin={MIN_WIDTH}
      aria-valuemax={MAX_WIDTH}
      aria-valuenow={Math.round(width)}
      tabIndex={0}
      className="group relative hidden cursor-col-resize touch-none items-center justify-center border-x border-white/[0.04] bg-[#0d0d0f] outline-none hover:bg-violet-500/10 focus-visible:bg-violet-500/10 lg:flex"
      onPointerDown={(event) => {
        dragState.current = { startX: event.clientX, startWidth: width }
        event.currentTarget.setPointerCapture(event.pointerId)
      }}
      onPointerMove={(event) => {
        if (!dragState.current) return
        onWidthChange(clampWidth(dragState.current.startWidth + event.clientX - dragState.current.startX))
      }}
      onPointerUp={(event) => {
        dragState.current = null
        event.currentTarget.releasePointerCapture(event.pointerId)
      }}
      onPointerCancel={() => {
        dragState.current = null
      }}
      onKeyDown={(event) => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return
        event.preventDefault()
        onWidthChange(clampWidth(width + (event.key === "ArrowRight" ? 16 : -16)))
      }}
    >
      <GripVertical className="size-4 text-white/20 transition-colors group-hover:text-violet-300 group-focus-visible:text-violet-300" />
    </div>
  )
}
