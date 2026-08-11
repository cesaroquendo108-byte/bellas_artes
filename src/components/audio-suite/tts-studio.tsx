"use client";

import { useMemo, useState } from "react";
import { Download, Languages, Play, Search, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { StatusPill } from "@/components/ui/motion-effects";
import type { AudioLibraryItem, AudioVoice } from "@/lib/audio/types";

import { AudioNav, ProviderNotice } from "./audio-nav";
import { Waveform } from "./waveform";

const controls = [
  { key: "speed", label: "Velocidad", min: 0.5, max: 2, step: 0.05 },
  { key: "stability", label: "Estabilidad", min: 0, max: 1, step: 0.05 },
  { key: "clarity", label: "Claridad", min: 0, max: 1, step: 0.05 },
  { key: "style", label: "Estilo", min: 0, max: 1, step: 0.05 },
] as const;

const quickPrompts = [
  {
    label: "Intro de podcast",
    text: "Bienvenidos. Hoy exploraremos una idea capaz de cambiar nuestra forma de crear.",
  },
  {
    label: "Presentación de producto",
    text: "Conoce una experiencia diseñada para convertir tus ideas en piezas visuales memorables.",
  },
  {
    label: "Narración cinematográfica",
    text: "La ciudad guardaba silencio mientras la primera luz atravesaba el horizonte.",
  },
] as const;

type VoiceValues = {
  speed: number;
  stability: number;
  clarity: number;
  style: number;
};

export function TtsStudio({
  voices,
  jobs,
  setupPending,
  providerMessage,
  initialScript = "",
}: {
  voices: AudioVoice[];
  jobs: AudioLibraryItem[];
  setupPending: boolean;
  providerMessage: string;
  initialScript?: string;
}) {
  const [query, setQuery] = useState("");
  const [voiceId, setVoiceId] = useState(voices[0]?.id ?? "");
  const [script, setScript] = useState(initialScript.slice(0, 10_000));
  const [format, setFormat] = useState<"mp3" | "wav">("mp3");
  const [values, setValues] = useState<VoiceValues>({
    speed: 1,
    stability: 0.6,
    clarity: 0.75,
    style: 0.35,
  });
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const visible = useMemo(
    () =>
      voices.filter((voice) =>
        `${voice.name} ${voice.language} ${voice.category}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [query, voices],
  );

  async function generate() {
    setSubmitting(true);
    setMessage("");
    try {
      const response = await fetch("/api/audio/tts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          idempotencyKey: crypto.randomUUID(),
          text: script,
          voiceId,
          format,
          ...values,
        }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        message?: string;
      };
      setMessage(result.message ?? "No se pudo iniciar la generación.");
    } catch {
      setMessage("No fue posible contactar el servicio de audio.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <AudioNav current="/audio/tts" />
      <header>
        <div className="flex flex-wrap items-center gap-3"><p className="text-xs font-semibold uppercase text-violet-300">Suite de audio</p><StatusPill state={setupPending ? "preparing" : "ready"} tone={setupPending ? "warning" : "success"} /></div>
        <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">
          Convierte tus palabras en una voz
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
          Elige una voz, dirige la interpretación y conserva cada versión en tu biblioteca privada.
        </p>
      </header>
      <ProviderNotice setupPending={setupPending} message={providerMessage} />

      <div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)_300px]">
        <aside className="border border-white/[0.08] bg-white/[0.025] p-4">
          <label className="relative block">
            <Search className="absolute top-2.5 left-3 size-4 text-slate-600" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar voces"
              className="pl-9"
            />
          </label>
          <div className="mt-4 space-y-2">
            {visible.map((voice) => (
              <button
                type="button"
                key={voice.id}
                onClick={() => setVoiceId(voice.id)}
                className={`w-full border p-3 text-left transition ${
                  voiceId === voice.id
                    ? "border-violet-400/50 bg-violet-500/10"
                    : "border-white/[0.07] hover:bg-white/[0.04]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-white">{voice.name}</span>
                  <Play className="size-3.5 text-violet-300" />
                </div>
                <p className="mt-1 text-xs text-slate-500">{voice.description}</p>
                <p className="mt-2 text-[10px] uppercase text-slate-600">
                  {voice.language} · {voice.category}
                </p>
              </button>
            ))}
            {!visible.length && (
              <p className="border border-dashed border-white/10 py-8 text-center text-xs text-slate-600">
                No hay voces que coincidan con la búsqueda.
              </p>
            )}
          </div>
        </aside>

        <section className="space-y-4">
          <div className="border border-white/[0.08] bg-[#101012] p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-medium text-white">Guion</h2>
              <span className="text-xs text-slate-600">{script.length}/10.000</span>
            </div>
            <div className="mt-3 flex max-w-full gap-2 overflow-x-auto pb-1">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt.label}
                  type="button"
                  onClick={() => setScript(prompt.text)}
                  className="min-w-fit rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] text-slate-400 transition hover:border-violet-400/40 hover:text-violet-200"
                >
                  {prompt.label}
                </button>
              ))}
            </div>
            <Textarea
              value={script}
              onChange={(event) => setScript(event.target.value.slice(0, 10_000))}
              placeholder="Escribe el texto que quieres convertir en voz…"
              className="mt-4 min-h-56 resize-none border-0 bg-transparent p-0 text-base leading-7 shadow-none focus-visible:ring-0"
            />
            <div className="mt-4 flex items-center gap-2 border-t border-white/[0.06] pt-4 text-xs text-slate-500">
              <Languages className="size-4" /> Idioma detectado automáticamente
            </div>
          </div>

          <div className="border border-white/[0.08] bg-white/[0.025] p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Previsualización</p>
                <p className="mt-1 text-sm font-medium text-white">
                  {voices.find((voice) => voice.id === voiceId)?.name ?? "Selecciona una voz"}
                </p>
              </div>
              <Button variant="outline" size="icon" disabled aria-label="Vista previa no disponible">
                <Play />
              </Button>
            </div>
            <Waveform progress={0} />
            <p className="text-xs text-slate-600">
              La forma de onda aparecerá sólo cuando exista una generación real.
            </p>
          </div>

          {message && (
            <p role="status" className="border-l-2 border-amber-400 px-3 text-sm text-amber-200">
              {message}
            </p>
          )}
          <Button
            onClick={generate}
            disabled={submitting || !script.trim() || !voiceId}
            className="w-full bg-violet-600 text-white hover:bg-violet-500"
          >
            <Sparkles /> {submitting ? "Comprobando servicio…" : "Generar voz"}
          </Button>
        </section>

        <aside className="space-y-5 border border-white/[0.08] bg-white/[0.025] p-5">
          <h2 className="font-medium text-white">Dirección de voz</h2>
          {controls.map((control) => (
            <label key={control.key} className="block">
              <span className="flex justify-between text-xs text-slate-400">
                <span>{control.label}</span>
                <span>{values[control.key].toFixed(2)}</span>
              </span>
              <Slider
                className="mt-3"
                min={control.min}
                max={control.max}
                step={control.step}
                value={[values[control.key]]}
                onValueChange={(nextValue) => {
                  const value = typeof nextValue === "number" ? nextValue : nextValue[0];
                  if (value !== undefined) {
                    setValues((current) => ({ ...current, [control.key]: value }));
                  }
                }}
              />
            </label>
          ))}
          <div className="border-t border-white/[0.07] pt-5">
            <p className="text-xs text-slate-500">Formato</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(["mp3", "wav"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setFormat(option)}
                  className={
                    format === option
                      ? "bg-violet-500/15 py-2 text-xs text-violet-200"
                      : "bg-white/[0.04] py-2 text-xs text-slate-500"
                  }
                >
                  {option.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-white">Generaciones recientes</h2>
          <span className="text-xs text-slate-600">{jobs.length} trabajos</span>
        </div>
        {jobs.length ? (
          <div className="mt-3 divide-y divide-white/[0.06] border-y border-white/[0.07]">
            {jobs.map((job) => (
              <div key={job.id} className="flex items-center gap-4 py-3">
                <Waveform compact className="min-w-0 flex-1" />
                <span className="text-xs text-slate-500">{job.status}</span>
                {job.signedUrl ? (
                  <a href={job.signedUrl} download aria-label={`Descargar ${job.name}`}>
                    <Download className="size-4 text-slate-400" />
                  </a>
                ) : (
                  <Download className="size-4 text-slate-700" aria-hidden />
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 border border-dashed border-white/10 py-10 text-center text-sm text-slate-600">
            Todavía no hay voces generadas.
          </p>
        )}
      </section>
    </div>
  );
}
