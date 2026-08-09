"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

export function DragScroller({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const state = useRef({ active: false, x: 0, left: 0 });
  return (
    <div
      ref={ref}
      className={cn(
        "cursor-grab overflow-x-auto overscroll-x-contain pb-3 active:cursor-grabbing",
        className,
      )}
      onPointerDown={(event) => {
        const node = ref.current;
        if (!node) return;
        state.current = {
          active: true,
          x: event.clientX,
          left: node.scrollLeft,
        };
        node.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        const node = ref.current;
        if (!node || !state.current.active || event.pointerType === "touch")
          return;
        node.scrollLeft =
          state.current.left - (event.clientX - state.current.x);
      }}
      onPointerUp={() => {
        state.current.active = false;
      }}
      onPointerCancel={() => {
        state.current.active = false;
      }}
    >
      {children}
    </div>
  );
}
