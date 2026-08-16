"use client";

import { GripVertical } from "lucide-react";
import { useRef } from "react";

interface ImageStudioResizeHandleProps {
  width: number;
  onWidthChange: (width: number) => void;
}

const MIN_WIDTH = 320;
const MAX_WIDTH = 480;

function clampWidth(width: number) {
  return Math.min(Math.max(width, MIN_WIDTH), MAX_WIDTH);
}

export function ImageStudioResizeHandle({
  width,
  onWidthChange,
}: ImageStudioResizeHandleProps) {
  const dragState = useRef<{ startX: number; startWidth: number } | null>(null);

  return (
    <div
      role="separator"
      aria-label="Redimensionar panel de controles"
      aria-orientation="vertical"
      aria-valuemin={MIN_WIDTH}
      aria-valuemax={MAX_WIDTH}
      aria-valuenow={Math.round(width)}
      tabIndex={0}
      className="group relative hidden cursor-col-resize touch-none items-center justify-center border-0 bg-transparent outline-none after:absolute after:inset-y-0 after:left-1/2 after:w-px after:-translate-x-1/2 after:bg-transparent after:transition-colors hover:after:bg-violet-400/70 focus-visible:after:bg-violet-400/70 lg:flex"
      onPointerDown={(event) => {
        dragState.current = { startX: event.clientX, startWidth: width };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (!dragState.current) return;
        onWidthChange(
          clampWidth(
            dragState.current.startWidth +
              event.clientX -
              dragState.current.startX,
          ),
        );
      }}
      onPointerUp={(event) => {
        dragState.current = null;
        event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onPointerCancel={() => {
        dragState.current = null;
      }}
      onKeyDown={(event) => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        onWidthChange(
          clampWidth(width + (event.key === "ArrowRight" ? 16 : -16)),
        );
      }}
    >
      <GripVertical className="relative z-10 size-4 text-transparent transition-colors group-hover:text-violet-300 group-focus-visible:text-violet-300" />
    </div>
  );
}
