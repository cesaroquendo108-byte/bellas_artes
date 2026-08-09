"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Copy, Film, Music2, Plus, Save, Scissors, Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import type { AudioLibraryItem } from "@/lib/audio/types";
import { validateMediaFile } from "@/lib/audio/validation";

import { AudioNav, ProviderNotice } from "./audio-nav";

type Track = {
  id: string;
  assetId: string | null;
  kind: "voice" | "music" | "effect" | "ambience";
  name: string;
  start: number;
  width: number;
  volume: number;
  speed: number;
};

const colors = {
  voice: "bg-violet-500/70",
  music: "bg-cyan-500/65",
  effect: "bg-amber-500/70",
  ambience: "bg-emerald-500/65",
};

const kindLabels: Record<Track["kind"], string> = {
  voice: "Voz",
  music: "Música",
  effect: "Efecto",
  ambience: "Ambiente",
};

export function VideoAudioStudio({
  assets,
  projects,
  setupPending,
  providerMessage,
}: {
  assets: AudioLibraryItem[];
  projects: Array<{
    id: string;
    name: string;
    duration_ms: number;
    preset: unknown;
    updated_at: string;
  }>;
  setupPending: boolean;
  providerMessage: string;
}) {
  const videoRef = useRef<HTMLInputElement>(null);
  const [video, setVideo] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [durationSeconds, setDurationSeconds] = useState(30);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, [videoUrl]);

  const selected = useMemo(
    () => tracks.find((track) => track.id === selectedId) ?? null,
    [selectedId, tracks],
  );

  function selectVideo(nextFile?: File) {
    if (!nextFile) return;
    const validationError = validateMediaFile(nextFile, "video");
    if (validationError) {
      setMessage(validationError);
      if (videoRef.current) videoRef.current.value = "";
      return;
    }
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideo(nextFile);
    setVideoUrl(URL.createObjectURL(nextFile));
    setMessage(
      "Este video es una previsualización local. Guárdalo en la biblioteca antes de usarlo en un render real.",
    );
  }

  function removeVideo() {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoUrl(null);
    setVideo(null);
    if (videoRef.current) videoRef.current.value = "";
  }

  function addTrack(kind: Track["kind"], asset?: AudioLibraryItem) {
    const id = crypto.randomUUID();
    setTracks((current) => [
      ...current,
      {
        id,
        assetId: asset?.id ?? null,
        kind,
        name: asset?.name ?? `${kindLabels[kind]} sin asset`,
        start: 0,
        width: 36,
        volume: kind === "music" ? 0.35 : 1,
        speed: 1,
      },
    ]);
    setSelectedId(id);
  }

  function updateSelected(change: Partial<Track>) {
    setTracks((current) =>
      current.map((track) => (track.id === selectedId ? { ...track, ...change } : track)),
    );
  }

  async function saveProject() {
    setBusy(true);
    setMessage("");
    try {
      const durationMs = Math.max(0, Math.round(durationSeconds * 1000));
      const response = await fetch("/api/audio/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: projectId ?? undefined,
          name: video?.name ? `Audio · ${video.name}` : "Proyecto de audio para video",
          sourceVideoAssetId: null,
          durationMs,
          preset: { localVideoName: video?.name ?? null },
          tracks: tracks.map((track) => ({
            id: track.id,
            assetId: track.assetId,
            kind: track.kind,
            name: track.name,
            startMs: Math.round((track.start / 100) * durationMs),
            trimStartMs: 0,
            durationMs: Math.max(0, Math.round((track.width / 100) * durationMs)),
            volume: track.volume,
            speed: track.speed,
            muted: false,
          })),
        }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        projectId?: string;
        message?: string;
        errorCode?: string;
      };
      if (!response.ok || !result.projectId) {
        throw new Error(result.message ?? "No se pudo guardar el proyecto.");
      }
      setProjectId(result.projectId);
      setMessage("Proyecto guardado. El video local todavía debe subirse como asset para renderizar.");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "No se pudo guardar el proyecto.");
    } finally {
      setBusy(false);
    }
  }

  async function exportMix() {
    if (!projectId) {
      setMessage("Guarda el proyecto antes de preparar la exportación.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/audio/mix", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          idempotencyKey: crypto.randomUUID(),
          projectId,
          format: "mp4",
        }),
      });
      const result = (await response.json().catch(() => ({}))) as { message?: string };
      setMessage(result.message ?? "La exportación todavía no está disponible.");
    } catch {
      setMessage("No fue posible contactar el servicio de audio.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <AudioNav current="/video/audio" />
      <header>
        <p className="text-xs font-semibold uppercase text-violet-300">Video · Audio</p>
        <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">
          Haz que cada pista entre en el momento justo
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
          Organiza voz, música, efectos y ambiente sobre un mismo video. Guarda el proyecto antes de exportar.
        </p>
      </header>
      <ProviderNotice setupPending={setupPending} message={providerMessage} />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <section className="space-y-5">
          <input
            ref={videoRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            className="hidden"
            onChange={(event) => selectVideo(event.target.files?.[0])}
          />
          <div className="relative flex aspect-video items-center justify-center overflow-hidden border border-white/[0.08] bg-[#050506]">
            {videoUrl ? (
              <video
                src={videoUrl}
                controls
                className="size-full object-contain"
                onLoadedMetadata={(event) => {
                  const duration = event.currentTarget.duration;
                  if (Number.isFinite(duration) && duration > 0) setDurationSeconds(duration);
                }}
              />
            ) : (
              <div className="text-center">
                <Film className="mx-auto size-8 text-slate-700" />
                <p className="mt-3 text-sm text-slate-400">Carga el video que quieres sonorizar</p>
                <Button variant="outline" className="mt-4" onClick={() => videoRef.current?.click()}>
                  <Upload /> Elegir video
                </Button>
              </div>
            )}
            {video && (
              <Button
                type="button"
                variant="destructive"
                size="icon-sm"
                onClick={removeVideo}
                aria-label="Quitar video local"
                className="absolute top-3 right-3"
              >
                <Trash2 />
              </Button>
            )}
          </div>

          <div className="border border-white/[0.08] bg-white/[0.02] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {(["voice", "music", "effect", "ambience"] as const).map((kind) => (
                  <Button key={kind} size="sm" variant="outline" onClick={() => addTrack(kind)}>
                    <Plus /> {kindLabels[kind]}
                  </Button>
                ))}
              </div>
              <span className="text-xs text-slate-600">{durationSeconds.toFixed(1)} s</span>
            </div>

            <div className="mt-5 overflow-x-auto">
              <div className="min-w-[680px]">
                <div className="ml-28 grid grid-cols-7 border-b border-white/[0.07] pb-2 text-[10px] text-slate-700">
                  {[0, 1, 2, 3, 4, 5, 6].map((part) => (
                    <span key={part}>{((durationSeconds / 6) * part).toFixed(0)}s</span>
                  ))}
                </div>
                <div className="mt-2 space-y-2">
                  {tracks.map((track) => (
                    <button
                      key={track.id}
                      type="button"
                      onClick={() => setSelectedId(track.id)}
                      className={`grid w-full grid-cols-[108px_1fr] items-center gap-3 p-1 text-left ${
                        selectedId === track.id ? "bg-white/[0.04]" : ""
                      }`}
                    >
                      <span className="truncate text-xs text-slate-500">{track.name}</span>
                      <span className="relative h-10 bg-white/[0.025]">
                        <span
                          className={`absolute top-1 h-8 ${colors[track.kind]} px-3 py-2 text-[10px] text-white`}
                          style={{ left: `${track.start}%`, width: `${track.width}%` }}
                        >
                          {kindLabels[track.kind]}
                        </span>
                      </span>
                    </button>
                  ))}
                  {!tracks.length && (
                    <p className="border border-dashed border-white/10 py-10 text-center text-xs text-slate-600">
                      La línea de tiempo está vacía. Añade una pista o un audio real de tu biblioteca.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <aside className="space-y-5 border border-white/[0.08] bg-white/[0.025] p-5">
          <h2 className="font-medium text-white">Inspector de pista</h2>
          {selected ? (
            <>
              <div>
                <p className="text-xs text-slate-600">Seleccionada</p>
                <p className="mt-1 text-sm text-white">{selected.name}</p>
                {!selected.assetId && (
                  <p className="mt-1 text-[10px] text-amber-300">Pista vacía: vincula un audio guardado.</p>
                )}
              </div>
              <label className="block">
                <span className="flex justify-between text-xs text-slate-400">
                  <span>Volumen</span>
                  <span>{Math.round(selected.volume * 100)}%</span>
                </span>
                <Slider
                  className="mt-3"
                  min={0}
                  max={2}
                  step={0.05}
                  value={[selected.volume]}
                  onValueChange={(nextValue) => {
                    const value = typeof nextValue === "number" ? nextValue : nextValue[0];
                    if (value !== undefined) updateSelected({ volume: value });
                  }}
                />
              </label>
              <label className="block">
                <span className="flex justify-between text-xs text-slate-400">
                  <span>Velocidad</span>
                  <span>{selected.speed.toFixed(2)}x</span>
                </span>
                <Slider
                  className="mt-3"
                  min={0.25}
                  max={4}
                  step={0.05}
                  value={[selected.speed]}
                  onValueChange={(nextValue) => {
                    const value = typeof nextValue === "number" ? nextValue : nextValue[0];
                    if (value !== undefined) updateSelected({ speed: value });
                  }}
                />
              </label>
              <div className="grid grid-cols-3 gap-2">
                <Button variant="outline" size="icon" title="Recortar" disabled>
                  <Scissors />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  title="Duplicar"
                  onClick={() => {
                    const id = crypto.randomUUID();
                    setTracks((current) => [
                      ...current,
                      { ...selected, id, start: Math.min(90, selected.start + 5) },
                    ]);
                    setSelectedId(id);
                  }}
                >
                  <Copy />
                </Button>
                <Button
                  variant="destructive"
                  size="icon"
                  title="Eliminar"
                  onClick={() => {
                    setTracks((current) => current.filter((track) => track.id !== selected.id));
                    setSelectedId(null);
                  }}
                >
                  <Trash2 />
                </Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-600">Selecciona una pista.</p>
          )}

          <div className="border-t border-white/[0.07] pt-5">
            <p className="text-xs text-slate-600">Audios disponibles</p>
            <div className="mt-3 max-h-40 space-y-2 overflow-y-auto">
              {assets.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => addTrack("music", asset)}
                  className="flex w-full items-center justify-between border border-white/[0.07] px-3 py-2 text-left text-xs text-slate-400 hover:border-violet-400/30"
                >
                  <span className="truncate">{asset.name}</span>
                  <Plus className="size-3" />
                </button>
              ))}
              {!assets.length && <p className="text-xs text-slate-700">Tu biblioteca de audio está vacía.</p>}
            </div>
            <p className="mt-3 text-xs text-slate-600">{projects.length} proyectos guardados</p>
          </div>

          <Button variant="outline" className="w-full" onClick={saveProject} disabled={busy}>
            <Save /> {busy ? "Guardando…" : "Guardar proyecto"}
          </Button>
          <Button
            className="w-full bg-violet-600 text-white hover:bg-violet-500"
            onClick={exportMix}
            disabled={busy || !projectId}
          >
            <Music2 /> Preparar exportación
          </Button>
          {message && (
            <p role="status" className="text-xs leading-5 text-amber-200">
              {message}
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
