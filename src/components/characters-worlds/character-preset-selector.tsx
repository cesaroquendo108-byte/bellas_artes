"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useCharacterBuilder } from "./character-builder-context";

const fields = {
  gender: ["female", "male", "nonbinary"],
  ethnicity: ["latina", "african", "asian", "european", "mixed"],
  ageRange: ["young", "adult", "senior"],
  bodyType: ["slim", "athletic", "curvy", "strong"],
  aesthetic: ["cinematic", "photorealistic", "anime", "cyberpunk", "3d-render"],
  expression: ["confident", "smiling", "thoughtful", "surprised"],
  pose: ["front", "three-quarter", "profile", "action"],
} as const;

export function CharacterPresetSelector() {
  const { state, setField } = useCharacterBuilder();
  function update(key: keyof typeof fields, value: string) {
    setField("structured", { ...state.structured, [key]: value });
  }
  return (
    <div className="grid grid-cols-2 gap-2">
      {Object.entries(fields).map(([key, values]) => (
        <div key={key} className="space-y-1.5">
          <Label className="text-[10px] capitalize text-slate-500">{key}</Label>
          <Select
            value={state.structured[key as keyof typeof fields]}
            onValueChange={(value) =>
              value && update(key as keyof typeof fields, value)
            }
          >
            <SelectTrigger className="w-full border-white/10 bg-white/[0.03] text-[10px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {values.map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}
    </div>
  );
}
