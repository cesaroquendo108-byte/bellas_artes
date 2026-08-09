"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeftRight, Mic, Play, Trash2, Upload, WandSparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import type { AudioVoice } from "@/lib/audio/types";
import { validateAudioFile } from "@/lib/audio/validation";

import { AudioNav, ProviderNotice } from "./audio-nav";
import { Waveform } from "./waveform";

type VoiceChangerValues = {
  pitch: number;
  speed: number;
  intensity: number;
};

export function VoiceChangerStudio({
  voices,
  setupPending,
  providerMessage,
}: {
  voices: AudioVoice[];
  setupPending: boolean;
  providerMessage: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaChunksRef = useRef<Blob[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [voiceId, setVoiceId] = useState(voices[0]?.id ?? "");
  const [consent, setConsent] = useState(false);
  const [preserveEmotion, setPreserveEmotion] = useState(true);
  const [values, setValues] = useState<VoiceChangerValues>({
    pitch: 0,
    speed: 1,
    intensity: 0.7,
  });
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [recording, setRecording] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      mediaRecorderRef.current?.stop();
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [previewUrl]);

  async function toggleRecording() {
    if (recording) {
      mediaRecorderRef.current?.stop();
      return;
    }

    if (setupPending) {
      setMessage(
        "La grabación está preparada, pero el micrófono seguirá deshabilitado hasta conectar un proveedor aprobado.",
      );
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setMessage("Este navegador no permite grabar audio desde el micrófono.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredTypes = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"];
      const mimeType = preferredTypes.find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);

      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      mediaChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) mediaChunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        setMessage("La grabación se interrumpió. Revisa el permiso del micrófono.");
      };
      recorder.onstop = () => {
        const type = recorder.mimeType || mimeType || "audio/webm";
        const blob = new Blob(mediaChunksRef.current, { type });
        mediaChunksRef.current = [];
        stream.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
        mediaRecorderRef.current = null;
        setRecording(false);

        if (!blob.size) {
          setMessage("No se capturó audio. Inténtalo de nuevo y habla cerca del micrófono.");
          return;
        }

        const extension = type.includes("ogg") ? "ogg" : "webm";
        selectFile(new File([blob], `grabacion-${Date.now()}.${extension}`, { type }));
        setMessage("Grabación lista. Escúchala antes de transformar la voz.");
      };
      recorder.start(250);
      setRecording(true);
      setMessage("Grabando… pulsa Detener cuando termines.");
    } catch {
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
      setRecording(false);
      setMessage("No pude acceder al micrófono. Revisa el permiso del navegador.");
    }
  }

  function selectFile(nextFile?: File) {
    if (!nextFile) return;
    const validationError = validateAudioFile(nextFile);
    if (validationError) {
      setMessage(validationError);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(nextFile);
    setPreviewUrl(URL.createObjectURL(nextFile));
    setMessage("");
  }

  function removeFile() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setFile(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function transform() {
    if (!file) {
      setMessage("Carga una muestra antes de continuar.");
      return;
    }
    setSubmitting(true);
    setMessage("");
    try {
      const payload = {
        idempotencyKey: crypto.randomUUID(),
        voiceId,
        ...values,
        preserveEmotion,
        consent,
      };
      const body = new FormData();
      body.set("file", file);
      body.set("payload", JSON.stringify(payload));
      const response = await fetch("/api/audio/voice-changer", { method: "POST", body });
      const result = (await response.json().catch(() => ({}))) as { message?: string };
      setMessage(result.message ?? "No se pudo iniciar la transformación.");
    } catch {
      setMessage("No fue posible contactar el servicio de audio.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <AudioNav current="/audio/voice-changer" />
      <header>
        <p className="text-xs font-semibold uppercase text-violet-300">Suite de audio</p>
        <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">
          Cambia la voz, conserva la intención
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
          Prueba otra interpretación sin perder el ritmo ni la emoción de la grabación original.
        </p>
      </header>
      <ProviderNotice setupPending={setupPending} message={providerMessage} />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-5">
          <div
            className="border border-dashed border-white/15 bg-white/[0.025] p-6 text-center"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              selectFile(event.dataTransfer.files[0]);
            }}
          >
            <input
              ref={inputRef}
              type="file"
              accept="audio/mpeg,audio/wav,audio/x-wav,audio/mp4,audio/webm,audio/ogg"
              className="hidden"
              onChange={(event) => selectFile(event.target.files?.[0])}
            />
            <Upload className="mx-auto size-6 text-violet-300" />
            <p className="mt-3 font-medium text-white">{file?.name ?? "Sube una muestra de voz"}</p>
            <p className="mt-1 text-xs text-slate-600">
              MP3, WAV, M4A, OGG o WebM · máximo 50 MB
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button variant="outline" onClick={() => inputRef.current?.click()}>
                <Upload /> Elegir archivo
              </Button>
              <Button
                variant="outline"
                onClick={toggleRecording}
                className={recording ? "border-red-400/40 text-red-200" : undefined}
              >
                <Mic /> {recording ? "Detener" : "Grabar"}
              </Button>
              {file && (
                <Button variant="destructive" onClick={removeFile}>
                  <Trash2 /> Quitar
                </Button>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="border border-white/[0.08] bg-[#101012] p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">Original</p>
                  <p className="mt-1 text-sm text-white">{file ? "Muestra local" : "Sin audio"}</p>
                </div>
                <Play className="size-4 text-slate-600" />
              </div>
              {previewUrl ? (
                <audio controls src={previewUrl} className="mt-5 w-full" aria-label="Preview de audio original" />
              ) : (
                <Waveform progress={0} />
              )}
            </div>
            <div className="border border-white/[0.08] bg-[#101012] p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">Transformada</p>
                  <p className="mt-1 text-sm text-white">Esperando generación real</p>
                </div>
                <Play className="size-4 text-slate-700" />
              </div>
              <Waveform progress={0} />
            </div>
          </div>

          <div className="flex items-center justify-between border border-white/[0.08] px-4 py-3">
            <span className="flex items-center gap-2 text-sm text-slate-400">
              <ArrowLeftRight className="size-4 text-violet-300" /> Comparación A/B
            </span>
            <span className="text-xs text-slate-600">Disponible al generar</span>
          </div>
        </section>

        <aside className="space-y-5 border border-white/[0.08] bg-white/[0.025] p-5">
          <div>
            <label className="text-xs text-slate-500" htmlFor="voice-profile">
              Perfil de voz
            </label>
            <select
              id="voice-profile"
              value={voiceId}
              onChange={(event) => setVoiceId(event.target.value)}
              className="mt-2 h-10 w-full border border-white/10 bg-[#101012] px-3 text-sm text-white"
            >
              {voices.map((voice) => (
                <option key={voice.id} value={voice.id}>
                  {voice.name} · {voice.category}
                </option>
              ))}
            </select>
          </div>

          {(
            [
              ["pitch", "Tono", -12, 12, 1],
              ["speed", "Velocidad", 0.5, 2, 0.05],
              ["intensity", "Intensidad", 0, 1, 0.05],
            ] as const
          ).map(([key, label, min, max, step]) => (
            <label key={key} className="block">
              <span className="flex justify-between text-xs text-slate-400">
                <span>{label}</span>
                <span>{values[key].toFixed(2)}</span>
              </span>
              <Slider
                className="mt-3"
                min={min}
                max={max}
                step={step}
                value={[values[key]]}
                onValueChange={(nextValue) => {
                  const value = typeof nextValue === "number" ? nextValue : nextValue[0];
                  if (value !== undefined) {
                    setValues((current) => ({ ...current, [key]: value }));
                  }
                }}
              />
            </label>
          ))}

          <label className="flex items-center justify-between border-t border-white/[0.07] pt-4 text-sm text-slate-400">
            <span>Preservar emoción</span>
            <Switch checked={preserveEmotion} onCheckedChange={setPreserveEmotion} />
          </label>
          <label className="flex items-start gap-3 border border-violet-400/20 bg-violet-500/[0.06] p-3 text-xs leading-5 text-slate-400">
            <input
              type="checkbox"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
              className="mt-1 accent-violet-500"
            />
            <span>
              Confirmo que tengo autorización para transformar esta voz y que no la usaré para suplantar a otra persona.
            </span>
          </label>
          {message && (
            <p role="status" className="border-l-2 border-amber-400 px-3 text-xs leading-5 text-amber-200">
              {message}
            </p>
          )}
          <Button
            className="w-full bg-violet-600 text-white hover:bg-violet-500"
            onClick={transform}
            disabled={submitting || !file || !voiceId || !consent}
          >
            <WandSparkles /> {submitting ? "Comprobando servicio…" : "Transformar voz"}
          </Button>
        </aside>
      </div>
    </div>
  );
}
