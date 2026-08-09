"use client";

import { Film } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { VIDEO_TOOL_META } from "./config";
import { VideoActionToolbar } from "./video-action-toolbar";
import { VideoComparisonStage } from "./video-comparison-stage";
import { VideoMaskCanvas } from "./video-mask-canvas";
import { VideoTimeline } from "./video-timeline";
import { useVideoStudio } from "./video-studio-context";

export function VideoPlayerStage() {
  const { state } = useVideoStudio();
  const { operation, fields } = state;
  const meta = VIDEO_TOOL_META[operation];
  const source =
    state.localMedia.sourceVideo ??
    state.localMedia.motionVideo ??
    state.localMedia.sourceImage ??
    state.localMedia.characterImage;
  const saved =
    state.savedAssets.sourceVideo ??
    state.savedAssets.motionVideo ??
    state.savedAssets.sourceImage ??
    state.savedAssets.characterImage;
  const url = source?.previewUrl ?? saved?.signedUrl;
  const sourceType = source?.type ?? saved?.type;
  const comparison = ["v2v", "upscale", "replace-character"].includes(
    operation,
  );
  const maskEnabled =
    ["action-sync", "replace-character"].includes(operation) &&
    fields.maskMode === "brush";

  return (
    <section className="flex min-h-0 flex-col bg-[#080809] p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge className="border border-violet-400/20 bg-violet-500/10 text-violet-200">
          {meta.shortTitle}
        </Badge>
        <span className="text-xs text-slate-500">
          {fields.aspectRatio} · {fields.durationSeconds}s · {fields.fps} FPS
        </span>
        <Badge
          variant="outline"
          className="ml-auto border-white/10 text-[10px] text-slate-400"
        >
          Preview local
        </Badge>
      </div>

      <div className="flex min-h-[300px] flex-1 items-center justify-center">
        <div className="w-full max-w-4xl">
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-black shadow-2xl shadow-violet-950/20">
            <div className="aspect-video">
              {url && sourceType === "video" && (
                <video
                  src={url}
                  className="size-full object-contain"
                  controls
                  preload="metadata"
                />
              )}
              {url && sourceType === "image" && (
                <div
                  role="img"
                  aria-label="Referencia del estudio"
                  className="size-full bg-contain bg-center bg-no-repeat"
                  style={{ backgroundImage: `url(${url})` }}
                />
              )}
              {!url && (
                <div className="flex size-full flex-col items-center justify-center px-6 text-center">
                  <div
                    className={`flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br ${meta.accent} shadow-2xl shadow-violet-500/15`}
                  >
                    <Film className="size-7 text-white" />
                  </div>
                  <h2 className="mt-5 text-lg font-semibold text-white">
                    Canvas de {meta.title}
                  </h2>
                  <p className="mt-2 max-w-md text-xs leading-5 text-slate-500">
                    Configura los controles y añade los assets requeridos. Los
                    resultados reales aparecerán aquí cuando se conecte el motor
                    de video.
                  </p>
                </div>
              )}
              {comparison && <VideoComparisonStage />}
              {maskEnabled && <VideoMaskCanvas brushSize={fields.brushSize} />}
            </div>
          </div>

          <div className="mt-4">
            <VideoTimeline
              duration={
                fields.durationSeconds +
                (operation === "extend" ? fields.extensionSeconds : 0)
              }
            />
          </div>
          <div className="mt-3">
            <VideoActionToolbar />
          </div>
        </div>
      </div>

      {state.feedback && (
        <div
          role="status"
          className={
            state.feedback.tone === "error"
              ? "mt-4 rounded-xl border border-rose-400/20 bg-rose-500/10 p-3 text-xs text-rose-200"
              : "mt-4 rounded-xl border border-violet-400/20 bg-violet-500/10 p-3 text-xs text-violet-200"
          }
        >
          {state.feedback.message}
        </div>
      )}
    </section>
  );
}
