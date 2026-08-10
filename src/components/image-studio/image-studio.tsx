"use client";

import { SlidersHorizontal, WandSparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type {
  GenerationJobResponse,
  ImageGenerationRequest,
} from "@/lib/generation/contracts";
import { useGenerationJob } from "@/lib/generation/use-generation-job";

import { ImageControls } from "./image-controls";
import { ImageGallery } from "./image-gallery";
import { ImageStudioResizeHandle } from "./image-studio-resize-handle";
import type {
  ImageGalleryAsset,
  ImageGenerationMode,
  ImageStudioBrandKit,
  ImageStudioSettings,
  LocalReferences,
  ReferenceCategory,
  SelectedReferenceAsset,
} from "./types";

const initialSettings: ImageStudioSettings = {
  prompt: "",
  model: "gpt-image-2",
  autoPolish: true,
  aspectRatio: "1:1",
  resolution: "1k",
  quality: "low",
  steps: 24,
  cfgScale: 7,
};

const emptyReferences: LocalReferences = {
  characters: [],
  brandKit: [],
  visual: [],
};

interface ImageStudioProps {
  initialAssets: ImageGalleryAsset[];
  galleryError: string | null;
  brandKits: ImageStudioBrandKit[];
}

export function ImageStudio({
  initialAssets,
  galleryError,
  brandKits,
}: ImageStudioProps) {
  const [panelWidth, setPanelWidth] = useState(400);
  const [mobileControlsOpen, setMobileControlsOpen] = useState(false);
  const [mode, setMode] = useState<ImageGenerationMode>("create");
  const [settings, setSettings] =
    useState<ImageStudioSettings>(initialSettings);
  const [references, setReferences] =
    useState<LocalReferences>(emptyReferences);
  const referencesRef = useRef(references);
  const [selectedAsset, setSelectedAsset] =
    useState<SelectedReferenceAsset | null>(null);
  const [selectedBrandKitId, setSelectedBrandKitId] = useState<string | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    tone: "error" | "info";
    message: string;
  } | null>(null);
  const { job: activeJob, error: pollingError } = useGenerationJob(activeJobId);

  useEffect(() => {
    referencesRef.current = references;
  }, [references]);

  useEffect(
    () => () => {
      Object.values(referencesRef.current)
        .flat()
        .forEach((reference) => URL.revokeObjectURL(reference.previewUrl));
    },
    [],
  );

  useEffect(() => {
    const stored = sessionStorage.getItem("bellas-artes-remix");
    if (!stored) return;

    let active = true;

    try {
      const remix = JSON.parse(stored) as {
        prompt?: unknown;
        sourcePostId?: unknown;
      };
      if (typeof remix.prompt === "string" && remix.prompt.trim()) {
        queueMicrotask(() => {
          if (!active) return;
          setSettings((current) => ({
            ...current,
            prompt: remix.prompt as string,
          }));
          setFeedback({
            tone: "info",
            message:
              "El contexto público se cargó como punto de partida. Revísalo antes de generar.",
          });
        });
      }
    } catch {
      // Ignore malformed browser-only handoff data.
    } finally {
      sessionStorage.removeItem("bellas-artes-remix");
    }
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (pollingError) {
      const timer = window.setTimeout(() => setFeedback({ tone: "error", message: pollingError }), 0);
      return () => window.clearTimeout(timer);
    }
    if (!activeJob) return;
    let message: string | null = null;
    let tone: "error" | "info" = "info";
    if (activeJob.status === "processing") {
      message = "La generación está procesándose en la GPU.";
    } else if (activeJob.status === "completed") {
      message = "Generación completada. La galería se actualizará al recargar.";
    } else if (activeJob.status === "failed" || activeJob.status === "canceled") {
      tone = "error";
      message = activeJob.message ?? "La generación terminó sin resultado.";
    }
    if (!message) return;
    const timer = window.setTimeout(() => setFeedback({ tone, message: message as string }), 0);
    return () => window.clearTimeout(timer);
  }, [activeJob, pollingError]);

  function addFiles(category: ReferenceCategory, files: File[]) {
    const created = files.map((file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      size: file.size,
      previewUrl: URL.createObjectURL(file),
    }));
    setReferences((current) => ({
      ...current,
      [category]: [...current[category], ...created],
    }));
  }

  function removeFile(category: ReferenceCategory, id: string) {
    setReferences((current) => {
      const removed = current[category].find(
        (reference) => reference.id === id,
      );
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return {
        ...current,
        [category]: current[category].filter(
          (reference) => reference.id !== id,
        ),
      };
    });
  }

  function recreate(asset: ImageGalleryAsset) {
    setSelectedAsset({
      id: asset.id,
      name: asset.name,
      signedUrl: asset.signedUrl,
    });
    setMode("variation");
    setFeedback({
      tone: "info",
      message: `“${asset.name}” se añadió como referencia guardada.`,
    });
    setMobileControlsOpen(true);
  }

  async function submitGeneration() {
    if (!settings.prompt.trim()) return;
    const selectedBrandKit = brandKits.find(
      (kit) => kit.id === selectedBrandKitId,
    );
    const referenceAssetIds = [
      ...(selectedAsset ? [selectedAsset.id] : []),
      ...(selectedBrandKit?.assets.map((asset) => asset.assetId) ?? []),
    ];

    if (mode === "variation" && !referenceAssetIds.length) {
      setFeedback({
        tone: "error",
        message:
          "Para crear una variación selecciona Recreate en una imagen guardada. Las cargas locales permanecen como previsualizaciones hasta habilitar la subida de referencias.",
      });
      return;
    }

    const requestBody: ImageGenerationRequest = {
      mode,
      ...settings,
      prompt: settings.prompt.trim(),
      referenceAssetIds: referenceAssetIds.length
        ? [...new Set(referenceAssetIds)]
        : undefined,
    };

    setIsSubmitting(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/generate/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      const payload = (await response.json().catch(() => null)) as
        (GenerationJobResponse & { message?: string }) | null;
      if (!response.ok) {
        setFeedback({
          tone: "error",
          message:
            payload?.message ??
            "No pudimos preparar la generación. Inténtalo nuevamente.",
        });
        return;
      }
      setFeedback({
        tone: "info",
        message: payload?.message ?? "La generación entró en cola.",
      });
      setActiveJobId(payload?.jobId ?? null);
    } catch {
      setFeedback({
        tone: "error",
        message:
          "No pudimos comunicarnos con el estudio. Comprueba tu conexión e inténtalo de nuevo.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const controls = (
    <ImageControls
      mode={mode}
      settings={settings}
      references={references}
      selectedAsset={selectedAsset}
      isSubmitting={isSubmitting}
      feedback={feedback}
      brandKits={brandKits}
      selectedBrandKitId={selectedBrandKitId}
      onModeChange={setMode}
      onSettingsChange={setSettings}
      onAddFiles={addFiles}
      onRemoveFile={removeFile}
      onRemoveSelectedAsset={() => setSelectedAsset(null)}
      onBrandKitChange={setSelectedBrandKitId}
      onSubmit={submitGeneration}
    />
  );

  return (
    <div className="min-h-[calc(100vh-3.5rem)] overflow-x-hidden border border-white/[0.05] bg-[#0a0a0a] lg:h-[calc(100vh-3.5rem)] lg:min-h-0 lg:overflow-hidden">
      <div className="flex items-center gap-3 border-b border-white/[0.06] bg-[#101012] px-4 py-3 lg:hidden">
        <div className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500">
          <WandSparkles className="size-4 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">Estudio de imágenes</p>
          <p className="truncate text-[10px] text-slate-500">
            GPT Image 2 · {settings.aspectRatio} · {settings.resolution}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-white/10 bg-white/[0.04]"
          onClick={() => setMobileControlsOpen(true)}
        >
          <SlidersHorizontal className="size-3.5" /> Controls
        </Button>
      </div>

      <div
        className="hidden h-full lg:grid"
        style={{ gridTemplateColumns: `${panelWidth}px 10px minmax(0, 1fr)` }}
      >
        <aside className="h-full min-w-0 overflow-hidden bg-[#101012]">
          {controls}
        </aside>
        <ImageStudioResizeHandle
          width={panelWidth}
          onWidthChange={setPanelWidth}
        />
        <ImageGallery
          assets={initialAssets}
          error={galleryError}
          onRecreate={recreate}
        />
      </div>

      <div className="lg:hidden">
        <ImageGallery
          assets={initialAssets}
          error={galleryError}
          onRecreate={recreate}
        />
      </div>

      <Sheet open={mobileControlsOpen} onOpenChange={setMobileControlsOpen}>
        <SheetContent
          side="bottom"
          className="h-[92dvh] max-h-[92dvh] gap-0 overflow-hidden rounded-t-3xl border-white/10 bg-[#101012] p-0 text-white lg:hidden"
        >
          <SheetHeader className="sr-only">
        <SheetTitle>Controles del estudio de imágenes</SheetTitle>
            <SheetDescription>
              Configura el modelo, las referencias y los parámetros de
              generación.
            </SheetDescription>
          </SheetHeader>
          {controls}
        </SheetContent>
      </Sheet>
    </div>
  );
}
