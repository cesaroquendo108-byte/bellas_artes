"use client";

import { Coins, LoaderCircle, Mic2, WandSparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

import type { StudioAsset, VideoStudioFields } from "./types";
import { VideoGenerationStatus } from "./video-generation-status";
import { VideoModelSelector } from "./video-model-selector";
import { VideoPromptComposer } from "./video-prompt-composer";
import { VideoStylePresets } from "./video-style-presets";
import { useVideoStudio } from "./video-studio-context";
import { VideoUploadDropzone } from "./video-upload-dropzone";

type NumericField = {
  [K in keyof VideoStudioFields]: VideoStudioFields[K] extends number
    ? K
    : never;
}[keyof VideoStudioFields];

function Section({
  title,
  children,
  open = true,
}: {
  title: string;
  children: React.ReactNode;
  open?: boolean;
}) {
  return (
    <details open={open} className="group border-b border-white/[0.07]">
      <summary className="cursor-pointer list-none px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 marker:hidden">
        {title}
        <span className="float-right text-slate-700 transition group-open:rotate-45">
          +
        </span>
      </summary>
      <div className="space-y-4 px-4 pb-4">{children}</div>
    </details>
  );
}

function RangeField({
  field,
  label,
  min,
  max,
  step = 1,
  suffix = "",
}: {
  field: NumericField;
  label: string;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
}) {
  const { state, setField } = useVideoStudio();
  const value = state.fields[field];
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-[11px]">
        <Label className="text-slate-400">{label}</Label>
        <span className="font-medium text-violet-300">
          {value}
          {suffix}
        </span>
      </div>
      <Slider
        value={[value]}
        onValueChange={(values) =>
          setField(field, (Array.isArray(values) ? values[0] : values) ?? value)
        }
        min={min}
        max={max}
        step={step}
      />
    </div>
  );
}

function SelectField<K extends keyof VideoStudioFields>({
  field,
  label,
  options,
}: {
  field: K;
  label: string;
  options: { value: VideoStudioFields[K]; label: string }[];
}) {
  const { state, setField } = useVideoStudio();
  const current = String(state.fields[field]);
  return (
    <div className="space-y-2">
      <Label className="text-[11px] text-slate-400">{label}</Label>
      <Select
        value={current}
        onValueChange={(value) => {
          const option = options.find((item) => String(item.value) === value);
          if (option) setField(field, option.value);
        }}
      >
        <SelectTrigger className="w-full border-white/10 bg-white/[0.03] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="start">
          {options.map((option) => (
            <SelectItem key={String(option.value)} value={String(option.value)}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function ToggleField({
  field,
  label,
  description,
}: {
  field: "randomSeed" | "faceRestore" | "keepCameraMotion" | "syncAudio";
  label: string;
  description: string;
}) {
  const { state, setField } = useVideoStudio();
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
      <div>
        <p className="text-[11px] font-medium text-slate-300">{label}</p>
        <p className="mt-1 text-[10px] leading-4 text-slate-600">
          {description}
        </p>
      </div>
      <Switch
        checked={state.fields[field]}
        onCheckedChange={(checked) => setField(field, checked)}
      />
    </div>
  );
}

function Segments<K extends keyof VideoStudioFields>({
  field,
  options,
}: {
  field: K;
  options: { value: VideoStudioFields[K]; label: string }[];
}) {
  const { state, setField } = useVideoStudio();
  return (
    <div className="flex gap-1 overflow-x-auto rounded-lg border border-white/[0.08] bg-black/20 p-1">
      {options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          onClick={() => setField(field, option.value)}
          className={cn(
            "min-w-fit flex-1 rounded-md px-2 py-1.5 text-[10px] font-medium transition",
            state.fields[field] === option.value
              ? "bg-violet-500 text-white"
              : "text-slate-500 hover:text-slate-200",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function SourceControls({ assets }: { assets: StudioAsset[] }) {
  const { state } = useVideoStudio();
  const { operation, fields } = state;

  if (operation === "t2v") return null;
  return (
    <Section title="Fuentes">
      {operation === "i2v" && (
        <>
          <VideoUploadDropzone
            slot="sourceImage"
            type="image"
            title="Frame inicial"
            description="JPEG, PNG o WEBP"
            assets={assets}
          />
          <VideoUploadDropzone
            slot="endFrame"
            type="image"
            title="Frame final (opcional)"
            description="Controla el cierre del movimiento"
            assets={assets}
          />
        </>
      )}
      {operation === "v2v" && (
        <VideoUploadDropzone
          slot="sourceVideo"
          type="video"
          title="Video fuente"
          description="MP4, MOV o WEBM"
          assets={assets}
        />
      )}
      {operation === "action-sync" && (
        <>
          <VideoUploadDropzone
            slot="characterImage"
            type="image"
            title="Personaje"
            description="Imagen clara de cuerpo completo"
            assets={assets}
          />
          <VideoUploadDropzone
            slot="motionVideo"
            type="video"
            title="Movimiento"
            description="Video con la actuación a transferir"
            assets={assets}
          />
        </>
      )}
      {operation === "effects" && (
        <VideoUploadDropzone
          slot="sourceImage"
          type="image"
          title="Fuente visual"
          description="Imagen para aplicar el efecto"
          assets={assets}
        />
      )}
      {["upscale", "lip-sync", "replace-character", "extend"].includes(
        operation,
      ) && (
        <VideoUploadDropzone
          slot="sourceVideo"
          type="video"
          title="Video fuente"
          description="Selecciona un video de tu biblioteca"
          assets={assets}
        />
      )}
      {operation === "lip-sync" && fields.audioMode === "upload" && (
        <VideoUploadDropzone
          slot="audio"
          type="audio"
          title="Pista de voz"
          description="MP3, WAV o M4A"
          assets={assets}
        />
      )}
      {operation === "lip-sync" && fields.audioMode === "record" && (
        <div className="rounded-xl border border-dashed border-violet-400/20 bg-violet-500/[0.05] p-5 text-center">
          <Mic2 className="mx-auto size-5 text-violet-300" />
          <p className="mt-2 text-xs text-slate-300">Grabación preparada</p>
          <p className="mt-1 text-[10px] leading-4 text-slate-600">
            El micrófono no se solicitará hasta conectar el proveedor de audio.
          </p>
        </div>
      )}
      {operation === "replace-character" &&
        fields.characterMode === "reference" && (
          <VideoUploadDropzone
            slot="characterImage"
            type="image"
            title="Nuevo personaje"
            description="Referencia de identidad y vestuario"
            assets={assets}
          />
        )}
    </Section>
  );
}

function OperationControls() {
  const { state } = useVideoStudio();
  const { operation, fields } = state;

  return (
    <>
      {operation === "effects" && (
        <Section title="Efecto">
          <Segments
            field="effectTemplate"
            options={[
              { value: "portal", label: "Portal" },
              { value: "levitation", label: "Levitation" },
              { value: "melt", label: "Melt" },
              { value: "explosion", label: "Explosion" },
            ]}
          />
          <VideoPromptComposer
            label="Dirección del efecto"
            placeholder="Describe cómo debe aparecer y evolucionar el efecto…"
          />
        </Section>
      )}

      {operation === "lip-sync" && (
        <Section title="Voz y sincronía">
          <Segments
            field="audioMode"
            options={[
              { value: "tts", label: "Texto a voz" },
              { value: "upload", label: "Subir audio" },
              { value: "record", label: "Grabar" },
            ]}
          />
          {fields.audioMode === "tts" && (
            <VideoPromptComposer
              label="Guion hablado"
              placeholder="Escribe el texto que dirá el personaje…"
            />
          )}
          <RangeField
            field="syncIntensity"
            label="Intensidad de sincronía"
            min={0}
            max={100}
            suffix="%"
          />
          <ToggleField
            field="faceRestore"
            label="Restauración facial"
            description="Prioriza detalle y estabilidad del rostro."
          />
        </Section>
      )}

      {operation === "upscale" && (
        <Section title="Mejora">
          <Segments
            field="targetResolution"
            options={[
              { value: "2k", label: "2K" },
              { value: "4k", label: "4K" },
            ]}
          />
          <RangeField
            field="enhancement"
            label="Enhancement"
            min={0}
            max={100}
            suffix="%"
          />
        </Section>
      )}

      {operation === "replace-character" && (
        <Section title="Personaje y máscara">
          <Segments
            field="characterMode"
            options={[
              { value: "reference", label: "Referencia" },
              { value: "preset", label: "Preset" },
              { value: "prompt", label: "Prompt" },
            ]}
          />
          <Segments
            field="maskMode"
            options={[
              { value: "auto", label: "Auto" },
              { value: "brush", label: "Brush" },
              { value: "smart", label: "Smart" },
            ]}
          />
          {fields.maskMode === "brush" && (
            <RangeField
              field="brushSize"
              label="Tamaño del pincel"
              min={6}
              max={90}
              suffix=" px"
            />
          )}
          <RangeField
            field="transformStrength"
            label="Fidelidad"
            min={0.1}
            max={1}
            step={0.05}
          />
          <VideoPromptComposer
            label="Definición del personaje"
            placeholder="Describe apariencia, vestuario y rasgos…"
          />
        </Section>
      )}

      {operation === "action-sync" && (
        <Section title="Movimiento y máscara">
          <Segments
            field="maskMode"
            options={[
              { value: "auto", label: "Auto" },
              { value: "brush", label: "Brush" },
              { value: "smart", label: "Smart" },
            ]}
          />
          {fields.maskMode === "brush" && (
            <RangeField
              field="brushSize"
              label="Tamaño del pincel"
              min={6}
              max={90}
              suffix=" px"
            />
          )}
          <RangeField
            field="motionStrength"
            label="Intensidad"
            min={1}
            max={10}
          />
          <SelectField
            field="cameraMotion"
            label="Cámara"
            options={[
              { value: "none", label: "Fija" },
              { value: "follow", label: "Seguimiento" },
              { value: "orbit", label: "Órbita" },
            ]}
          />
          <VideoPromptComposer label="Dirección creativa" />
        </Section>
      )}

      {operation === "extend" && (
        <Section title="Extensión">
          <Segments
            field="extendMode"
            options={[
              { value: "time", label: "Tiempo" },
              { value: "spatial", label: "Outpainting" },
            ]}
          />
          {fields.extendMode === "time" ? (
            <>
              <Segments
                field="extendDirection"
                options={[
                  { value: "forward", label: "Después" },
                  { value: "backward", label: "Antes" },
                  { value: "both", label: "Ambos" },
                ]}
              />
              <RangeField
                field="extensionSeconds"
                label="Segundos nuevos"
                min={2}
                max={15}
                suffix="s"
              />
            </>
          ) : (
            <Segments
              field="extendDirection"
              options={[
                { value: "left", label: "Izquierda" },
                { value: "right", label: "Derecha" },
                { value: "up", label: "Arriba" },
                { value: "down", label: "Abajo" },
                { value: "all", label: "Todo" },
              ]}
            />
          )}
          <SelectField
            field="aspectRatio"
            label="Ratio destino"
            options={[
              { value: "16:9", label: "16:9 Landscape" },
              { value: "9:16", label: "9:16 Portrait" },
              { value: "1:1", label: "1:1 Square" },
              { value: "4:3", label: "4:3 Classic" },
            ]}
          />
          <ToggleField
            field="keepCameraMotion"
            label="Continuar cámara"
            description="Conserva la dirección del movimiento original."
          />
          <ToggleField
            field="syncAudio"
            label="Continuar audio"
            description="Prepara continuidad de audio para el futuro worker."
          />
          <VideoPromptComposer label="Continuación de la escena" />
        </Section>
      )}

      {["t2v", "i2v", "v2v"].includes(operation) && (
        <Section title="Dirección creativa">
          <VideoPromptComposer
            label={operation === "i2v" ? "Prompt de movimiento" : undefined}
          />
          {operation === "t2v" && <VideoPromptComposer negative />}
          {operation === "v2v" && (
            <RangeField
              field="transformStrength"
              label="Fuerza de transformación"
              min={0.1}
              max={1}
              step={0.05}
            />
          )}
          <VideoStylePresets />
        </Section>
      )}
    </>
  );
}

function TechnicalControls() {
  const { state } = useVideoStudio();
  const { operation } = state;
  if (
    ["effects", "upscale", "lip-sync", "replace-character"].includes(operation)
  )
    return null;
  return (
    <Section title="Parámetros" open={operation === "t2v"}>
      {operation !== "extend" && (
        <SelectField
          field="aspectRatio"
          label="Aspect ratio"
          options={[
            { value: "16:9", label: "16:9 Landscape" },
            { value: "9:16", label: "9:16 Portrait" },
            { value: "1:1", label: "1:1 Square" },
            { value: "4:3", label: "4:3 Classic" },
          ]}
        />
      )}
      {["t2v", "i2v"].includes(operation) && (
        <>
          <RangeField
            field="durationSeconds"
            label="Duración"
            min={2}
            max={15}
            suffix="s"
          />
          <RangeField
            field="motionStrength"
            label="Motion strength"
            min={1}
            max={10}
          />
          <SelectField
            field="cameraMotion"
            label="Movimiento de cámara"
            options={[
              { value: "none", label: "Sin movimiento" },
              { value: "pan-left", label: "Pan izquierda" },
              { value: "zoom-in", label: "Zoom in" },
              { value: "orbit", label: "Órbita" },
            ]}
          />
        </>
      )}
      {["t2v", "i2v", "v2v"].includes(operation) && (
        <>
          <SelectField
            field="fps"
            label="FPS"
            options={[
              { value: 24, label: "24 FPS" },
              { value: 30, label: "30 FPS" },
              { value: 60, label: "60 FPS" },
            ]}
          />
          <RangeField
            field="cfgScale"
            label="CFG Scale"
            min={1}
            max={20}
            step={0.5}
          />
          <ToggleField
            field="randomSeed"
            label="Seed aleatorio"
            description="Genera una variación distinta en cada solicitud."
          />
        </>
      )}
    </Section>
  );
}

export function VideoControlPanel({
  assets,
  onSubmit,
}: {
  assets: StudioAsset[];
  onSubmit: () => void;
}) {
  const { state } = useVideoStudio();
  return (
    <div className="flex h-full min-h-0 flex-col bg-[#0d0d10]">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <Section title="Motor">
          <VideoModelSelector />
        </Section>
        <SourceControls assets={assets} />
        <OperationControls />
        <TechnicalControls />
        <div className="p-4">
          <VideoGenerationStatus />
        </div>
      </div>
      <div className="border-t border-white/[0.08] bg-[#0d0d10]/95 p-4 backdrop-blur-xl">
        <Button
          type="button"
          size="lg"
          onClick={onSubmit}
          disabled={state.submitting}
          className="h-11 w-full bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-500 text-white shadow-lg shadow-violet-600/20 hover:brightness-110"
        >
          {state.submitting ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <WandSparkles className="size-4" />
          )}
          {state.submitting ? "Validando…" : "Generate Video"}
        </Button>
        <div className="mt-2 flex items-center justify-center gap-1.5 text-[10px] text-slate-600">
          <Coins className="size-3" /> 0 créditos en esta fase{" "}
          <Badge
            variant="outline"
            className="h-4 border-white/10 px-1 text-[8px]"
          >
            Preview
          </Badge>
        </div>
      </div>
    </div>
  );
}
