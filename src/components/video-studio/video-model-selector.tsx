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

export function VideoModelSelector() {
  const { state, setField } = useVideoStudio();
  const generative = state.operation === "t2v" || state.operation === "i2v" || state.operation === "v2v";
  const models = generative
    ? [
        { value: "hunyuan-video-1.5-8.3b", label: "HunyuanVideo 8.3B · En preparación" },
        { value: "hunyuan-video-13b", label: "HunyuanVideo 13B · Pro/B2B" },
      ]
    : [{ value: state.fields.model, label: "Workflow dedicado · En preparación" }];
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
