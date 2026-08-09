"use client";

import { cn } from "@/lib/utils";

const bars = [18,34,22,48,66,38,74,52,26,58,82,44,64,30,72,50,88,46,62,28,54,76,42,68,36,60,24,48,70,32,56,40,78,52,30,64,44,72,34,50];

export function Waveform({ progress = 0, compact = false, className }: { progress?: number; compact?: boolean; className?: string }) {
  return <div className={cn("relative flex items-center gap-1 overflow-hidden", compact ? "h-12" : "h-24", className)} aria-label="Forma de onda">
    {bars.map((height, index) => <span key={index} className="w-1.5 shrink-0 rounded-full bg-white/10" style={{ height: `${compact ? Math.max(8, height / 2) : height}%` }}><span className="block w-full rounded-full bg-violet-400" style={{ height: index / bars.length <= progress ? "100%" : "0%" }} /></span>)}
  </div>;
}
