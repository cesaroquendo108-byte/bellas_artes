"use client";

import { AlertCircle, LoaderCircle, ServerOff } from "lucide-react";

import { GenerationSkeleton, StatusPill } from "@/components/ui/motion-effects";

import { useVideoStudio } from "./video-studio-context";

export function VideoGenerationStatus() {
  const { state } = useVideoStudio();

  if (state.submitting) {
    return (
      <div className="space-y-3 rounded-xl border border-violet-400/20 bg-violet-500/10 p-3 text-xs text-violet-200">
        <div className="flex items-center gap-2"><LoaderCircle className="size-4 animate-spin" /> <StatusPill state="loading" tone="info" /> Validando solicitud…</div>
        <GenerationSkeleton className="min-h-16 rounded-xl" />
      </div>
    );
  }
  if (!state.feedback) return null;

  const Icon = state.feedback.tone === "error" ? AlertCircle : ServerOff;
  return (
    <div
      className={
        state.feedback.tone === "error"
          ? "flex items-start gap-2 rounded-xl border border-rose-400/20 bg-rose-500/10 p-3 text-xs leading-5 text-rose-200"
          : "flex items-start gap-2 rounded-xl border border-violet-400/20 bg-violet-500/10 p-3 text-xs leading-5 text-violet-200"
      }
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <span>{state.feedback.message}</span>
    </div>
  );
}
