"use client";

import { Sparkles } from "lucide-react";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { useVideoStudio } from "./video-studio-context";

export function VideoPromptComposer({
  negative = false,
  label,
  placeholder,
}: {
  negative?: boolean;
  label?: string;
  placeholder?: string;
}) {
  const { state, setField } = useVideoStudio();
  const key = negative ? "negativePrompt" : "prompt";
  const value = state.fields[key];
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={`video-${key}`} className="text-[11px] text-slate-400">
          {label ?? (negative ? "Descripción negativa" : "Descripción")}
        </Label>
        {!negative && <Sparkles className="size-3.5 text-violet-300" />}
      </div>
      <Textarea
        id={`video-${key}`}
        value={value}
        onChange={(event) => setField(key, event.target.value)}
        placeholder={
          placeholder ??
          (negative
            ? "Elementos que deseas evitar…"
            : "Describe movimiento, escena, cámara y atmósfera…")
        }
        className="min-h-24 resize-none border-white/10 bg-white/[0.03] text-xs leading-5"
      />
      <p className="text-right text-[10px] text-slate-600">
        {value.length}/2000
      </p>
    </div>
  );
}
