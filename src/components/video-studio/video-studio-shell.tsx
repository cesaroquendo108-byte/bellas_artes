"use client";

import { useState } from "react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type {
  GenerationJobResponse,
  VideoGenerationRequest,
  VideoOperation,
} from "@/lib/generation/contracts";

import { VIDEO_TOOL_META } from "./config";
import type { MediaSlot, StudioAsset } from "./types";
import { VideoControlPanel } from "./video-control-panel";
import { VideoHistoryGrid } from "./video-history-grid";
import { VideoPlayerStage } from "./video-player-stage";
import { VideoStudioHeader } from "./video-studio-header";
import { VideoStudioProvider, useVideoStudio } from "./video-studio-context";

function requiredSlots(
  operation: VideoOperation,
  audioMode: string,
): MediaSlot[] {
  switch (operation) {
    case "t2v":
      return [];
    case "i2v":
      return ["sourceImage"];
    case "v2v":
      return ["sourceVideo"];
    case "action-sync":
      return ["characterImage", "motionVideo"];
    case "effects":
      return ["sourceImage"];
    case "upscale":
      return ["sourceVideo"];
    case "lip-sync":
      return audioMode === "tts" ? ["sourceVideo"] : ["sourceVideo", "audio"];
    case "replace-character":
      return ["sourceVideo", "characterImage"];
    case "extend":
      return ["sourceVideo"];
  }
}

function Workspace({
  assets,
  assetsUnavailable,
}: {
  assets: StudioAsset[];
  assetsUnavailable?: boolean;
}) {
  const [controlsOpen, setControlsOpen] = useState(false);
  const { state, setFeedback, setSubmitting } = useVideoStudio();
  const { fields, operation, savedAssets, localMedia } = state;

  async function submit() {
    setFeedback(null);
    const missing = requiredSlots(operation, fields.audioMode).filter(
      (slot) => !savedAssets[slot],
    );
    if (missing.length > 0) {
      const onlyLocal = missing.some((slot) => localMedia[slot]);
      setFeedback({
        tone: "error",
        message: onlyLocal
          ? "La previsualización local funciona, pero la generación real requiere guardar primero esos archivos como assets."
          : "Selecciona los assets guardados requeridos antes de generar.",
      });
      return;
    }

    const sourceSlots: MediaSlot[] =
      operation === "action-sync"
        ? ["motionVideo"]
        : operation === "i2v" || operation === "effects"
          ? ["sourceImage"]
          : ["sourceVideo"];
    const referenceSlots: MediaSlot[] =
      operation === "i2v"
        ? ["endFrame"]
        : operation === "action-sync"
          ? ["characterImage"]
          : operation === "lip-sync"
            ? ["audio"]
            : operation === "replace-character"
              ? ["characterImage"]
              : [];

    const sourceAssetIds = sourceSlots.flatMap((slot) =>
      savedAssets[slot]?.id ? [savedAssets[slot].id] : [],
    );
    const referenceAssetIds = referenceSlots.flatMap((slot) =>
      savedAssets[slot]?.id ? [savedAssets[slot].id] : [],
    );
    const parameters: VideoGenerationRequest["parameters"] = {
      durationSeconds: fields.durationSeconds,
      motionStrength: fields.motionStrength,
      fps: fields.fps,
      seed: fields.seed,
      randomSeed: fields.randomSeed,
      cfgScale: fields.cfgScale,
      stylePreset: fields.stylePreset,
      cameraMotion: fields.cameraMotion,
      transformStrength: fields.transformStrength,
      effectTemplate: fields.effectTemplate,
      targetResolution: fields.targetResolution,
      enhancement: fields.enhancement,
      audioMode: fields.audioMode,
      syncIntensity: fields.syncIntensity,
      faceRestore: fields.faceRestore,
      extendMode: fields.extendMode,
      extendDirection: fields.extendDirection,
      extensionSeconds: fields.extensionSeconds,
      keepCameraMotion: fields.keepCameraMotion,
      syncAudio: fields.syncAudio,
      maskMode: fields.maskMode,
      brushSize: fields.brushSize,
      characterMode: fields.characterMode,
    };
    const payload: VideoGenerationRequest = {
      operation,
      model: fields.model,
      prompt: fields.prompt || undefined,
      negativePrompt: fields.negativePrompt || undefined,
      aspectRatio: fields.aspectRatio,
      sourceAssetIds: sourceAssetIds.length ? sourceAssetIds : undefined,
      referenceAssetIds: referenceAssetIds.length
        ? referenceAssetIds
        : undefined,
      parameters,
    };

    setSubmitting(true);
    try {
      const response = await fetch("/api/generate/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json()) as
        GenerationJobResponse | { message?: string; error?: string };
      if (!response.ok) {
        const message = "message" in body ? body.message : undefined;
        const error = "error" in body ? body.error : undefined;
        setFeedback({
          tone: response.status === 503 ? "info" : "error",
          message: message ?? error ?? "No se pudo validar la solicitud.",
        });
        return;
      }
      setFeedback({
        tone: "info",
        message:
          "message" in body && body.message
            ? body.message
            : "Solicitud aceptada.",
      });
      setControlsOpen(false);
    } catch {
      setFeedback({
        tone: "error",
        message: "No fue posible contactar el endpoint de generación.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100dvh-1rem)] min-w-0 flex-col overflow-hidden bg-[#080809] text-slate-100 lg:h-[calc(100dvh-1rem)]">
      <VideoStudioHeader onOpenControls={() => setControlsOpen(true)} />
      {assetsUnavailable && (
        <div className="border-b border-amber-400/20 bg-amber-500/[0.07] px-4 py-2 text-center text-[10px] text-amber-200">
          La biblioteca no está disponible; puedes seguir diseñando con previews
          locales.
        </div>
      )}
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)_300px] 2xl:grid-cols-[360px_minmax(0,1fr)_340px]">
        <div className="hidden min-h-0 border-r border-white/[0.07] lg:block">
          <VideoControlPanel assets={assets} onSubmit={submit} />
        </div>
        <VideoPlayerStage />
        <VideoHistoryGrid assets={assets} />
      </div>
      <Sheet open={controlsOpen} onOpenChange={setControlsOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[88dvh] gap-0 overflow-hidden rounded-t-3xl border-white/10 bg-[#0d0d10] p-0 lg:hidden"
        >
          <SheetHeader className="border-b border-white/[0.07]">
            <SheetTitle className="text-white">
              Controles · {VIDEO_TOOL_META[operation].shortTitle}
            </SheetTitle>
            <SheetDescription>
              Configura la generación sin perder el preview.
            </SheetDescription>
          </SheetHeader>
          <VideoControlPanel assets={assets} onSubmit={submit} />
        </SheetContent>
      </Sheet>
    </div>
  );
}

export function VideoStudioShell({
  operation,
  assets,
  assetsUnavailable,
}: {
  operation: VideoOperation;
  assets: StudioAsset[];
  assetsUnavailable?: boolean;
}) {
  return (
    <VideoStudioProvider operation={operation}>
      <Workspace assets={assets} assetsUnavailable={assetsUnavailable} />
    </VideoStudioProvider>
  );
}
