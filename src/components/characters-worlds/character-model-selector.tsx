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

import { useCharacterBuilder } from "./character-builder-context";

const models = [
  { value: "flux-schnell-reference", label: "Flux Schnell con referencias · En preparación", disabled: false },
  { value: "flux-dev-reference", label: "Flux Dev con referencias · Pro/B2B", disabled: true },
] as const;

export function CharacterModelSelector() {
  const { state, setField } = useCharacterBuilder();
  return (
    <div className="space-y-2">
      <Label className="text-[11px] text-slate-400">Modelo base</Label>
      <Select
        value={state.model}
        onValueChange={(value) => value && setField("model", value)}
      >
        <SelectTrigger className="w-full border-white/10 bg-white/[0.03] text-xs">
          <Cpu className="size-3.5 text-violet-300" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {models.map((model) => (
            <SelectItem key={model.value} value={model.value} disabled={model.disabled}>
              {model.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
