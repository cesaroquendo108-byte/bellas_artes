"use client";

import { Cpu } from "lucide-react";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useVideoStudio } from "./video-studio-context";

const models = [
  { value: "openart-video-v2", label: "OpenArt Video V2" },
  { value: "openart-animate-v2", label: "OpenArt Animate V2" },
  { value: "openart-v2v-2.5", label: "OpenArt V2V 2.5" },
  { value: "motion-sync-v2", label: "Sincronía de movimiento V2" },
  { value: "seedance-2", label: "Seedance 2" },
  { value: "video-upscaler-v2", label: "Mejora de video V2" },
  { value: "lip-sync-v2.5", label: "Sincronía labial V2.5" },
  { value: "character-swap-v2", label: "Intercambio de personaje V2" },
  { value: "kling-extend-v1.5", label: "Extensión Kling 1.5" },
  { value: "seedance-1.5-pro", label: "Seedance 1.5 Pro" },
  { value: "veo-3.1", label: "Veo 3.1" },
  { value: "kling-2.1", label: "Kling 2.1" },
  { value: "wan-2.2", label: "Wan 2.2" },
  { value: "topaz-video", label: "Topaz Video" },
];

export function VideoModelSelector() {
  const { state, setField } = useVideoStudio();
  return (
    <div className="space-y-2">
      <Label className="text-[11px] text-slate-400">Modelo</Label>
      <Select
        value={state.fields.model}
        onValueChange={(value) => value && setField("model", value)}
      >
        <SelectTrigger className="w-full border-white/10 bg-white/[0.03] text-xs">
          <Cpu className="size-3.5 text-violet-300" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="start">
          {models.map((model) => (
            <SelectItem key={model.value} value={model.value}>
              {model.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
