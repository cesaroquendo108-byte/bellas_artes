"use client";

import { AlertCircle, LoaderCircle, ServerOff } from "lucide-react";

import { useVideoStudio } from "./video-studio-context";

export function VideoGenerationStatus() {
  const { state } = useVideoStudio();

  if (state.submitting) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-violet-400/20 bg-violet-500/10 p-3 text-xs text-violet-200">
        <LoaderCircle className="size-4 animate-spin" /> Validando solicitud…
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
