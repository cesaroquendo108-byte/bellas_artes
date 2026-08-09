"use client";

import { useMemo, useState } from "react";
import { Check, Download, Pause, Play, Search, Volume2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AudioLibraryItem } from "@/lib/audio/types";

import { AudioNav, ProviderNotice } from "./audio-nav";
import { Waveform } from "./waveform";

const tabs = [
  ["all", "Mis audios"],
  ["tts", "TTS"],
  ["voice_changer", "Voice Changer"],
  ["voice_clone", "Voice Clone"],
] as const;

export function AudioLibrary({
  jobs,
  assets,
  setupPending,
  providerMessage,
}: {
  jobs: AudioLibraryItem[];
  assets: AudioLibraryItem[];
  setupPending: boolean;
  providerMessage: string;
}) {
  const [tab, setTab] = useState<(typeof tabs)[number][0]>("all");
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<AudioLibraryItem | null>(null);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  const items = useMemo(
    () =>
      [...assets, ...jobs].filter(
        (item) =>
          (tab === "all" || item.kind === tab) &&
          item.name.toLowerCase().includes(query.toLowerCase()),
      ),
    [assets, jobs, query, tab],
  );

  const selectedItems = useMemo(
    () => items.filter((item) => selected.has(item.id)),
    [items, selected],
  );

  function toggleSelected(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function downloadSelected() {
    selectedItems.forEach((item) => {
      if (!item.signedUrl) return;
      const link = document.createElement("a");
      link.href = item.signedUrl;
      link.download = item.name;
      link.rel = "noreferrer";
      link.click();
    });
  }

  return (
    <div className="space-y-6 pb-28">
      <AudioNav current="/audio/my" />
      <header>
        <p className="text-xs font-semibold uppercase text-violet-300">Biblioteca privada</p>
        <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">
          Tus voces, listas para volver a usarse
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
          Encuentra una toma, descárgala o llévala a otra parte del estudio sin subirla de nuevo.
        </p>
      </header>
      <ProviderNotice setupPending={setupPending} message={providerMessage} />

      <div className="flex flex-col gap-3 border-b border-white/[0.07] pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex max-w-full gap-1 overflow-x-auto">
          {tabs.map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setTab(value);
                setSelected(new Set());
              }}
              className={`min-w-fit px-3 py-2 text-xs ${
                tab === value ? "bg-violet-500/15 text-violet-200" : "text-slate-500"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="relative block lg:w-72">
          <Search className="absolute top-2.5 left-3 size-4 text-slate-600" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar audio"
            className="pl-9"
          />
        </label>
      </div>

      {items.length ? (
        <div className="divide-y divide-white/[0.06] border-y border-white/[0.07]">
          {items.map((item) => {
            const checked = selected.has(item.id);
            return (
              <div
                key={`${item.kind}-${item.id}`}
                className={`grid gap-3 py-4 sm:grid-cols-[34px_36px_minmax(160px,.8fr)_minmax(180px,1fr)_auto] sm:items-center ${
                  checked ? "bg-violet-500/[0.05]" : ""
                }`}
              >
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={checked}
                  aria-label={`Seleccionar ${item.name}`}
                  onClick={() => toggleSelected(item.id)}
                  className="flex size-7 items-center justify-center border border-white/10 text-violet-200"
                >
                  {checked && <Check className="size-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => setActive(active?.id === item.id ? null : item)}
                  disabled={!item.signedUrl}
                  className="flex size-9 items-center justify-center border border-white/10 text-slate-400 disabled:opacity-35"
                  aria-label={`Reproducir ${item.name}`}
                >
                  {active?.id === item.id ? <Pause className="size-4" /> : <Play className="size-4" />}
                </button>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{item.name}</p>
                  <p className="mt-1 text-xs text-slate-600">
                    {item.kind.replace("_", " ")} · {new Date(item.createdAt).toLocaleDateString("es-VE")}
                  </p>
                </div>
                <Waveform compact progress={active?.id === item.id ? 0.37 : 0} />
                <div className="flex items-center gap-3 text-slate-600">
                  <span className="text-xs">{item.status}</span>
                  {item.signedUrl ? (
                    <a href={item.signedUrl} download aria-label={`Descargar ${item.name}`}>
                      <Download className="size-4" />
                    </a>
                  ) : (
                    <Download className="size-4 opacity-30" aria-hidden />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="border border-dashed border-white/10 py-16 text-center">
          <p className="text-sm text-slate-500">Todavía no hay audios en esta vista.</p>
          <p className="mt-2 text-xs text-slate-700">
            Las generaciones terminadas aparecerán aquí con acceso firmado.
          </p>
        </div>
      )}

      {selected.size > 0 && (
        <div className="fixed bottom-5 left-1/2 z-50 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-2 rounded-full border border-violet-400/20 bg-black/90 p-2 pl-4 shadow-2xl backdrop-blur-xl">
          <span className="whitespace-nowrap text-xs text-white">{selected.size} seleccionados</span>
          <Button
            type="button"
            size="sm"
            onClick={downloadSelected}
            disabled={!selectedItems.some((item) => item.signedUrl)}
            className="rounded-full bg-violet-600 text-white"
          >
            <Download /> Descargar
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setSelected(new Set())}
            aria-label="Limpiar selección"
            className="rounded-full"
          >
            <X />
          </Button>
        </div>
      )}

      {active?.signedUrl && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0c0c0e]/95 px-4 py-3 backdrop-blur-xl">
          <div className="mx-auto flex max-w-6xl items-center gap-4">
            <button
              type="button"
              onClick={() => setActive(null)}
              className="flex size-9 items-center justify-center bg-violet-600 text-white"
              aria-label="Cerrar reproductor"
            >
              <Pause className="size-4" />
            </button>
            <div className="w-40 min-w-0">
              <p className="truncate text-sm text-white">{active.name}</p>
              <p className="text-xs text-slate-600">Reproductor global</p>
            </div>
            <audio className="h-9 min-w-0 flex-1" controls src={active.signedUrl} autoPlay />
            <Volume2 className="size-4 text-slate-600" />
          </div>
        </div>
      )}
    </div>
  );
}
