"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface CharacterFilterValues {
  style: string;
  gender: string;
  age: string;
}

export function CharacterFilters({
  value,
  onChange,
}: {
  value: CharacterFilterValues;
  onChange: (value: CharacterFilterValues) => void;
}) {
  const field = (
    key: keyof CharacterFilterValues,
    options: { value: string; label: string }[],
  ) => (
    <Select
      value={value[key]}
      onValueChange={(next) => next && onChange({ ...value, [key]: next })}
    >
      <SelectTrigger className="w-full border-white/10 bg-white/[0.03] text-xs sm:w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
  return (
    <div className="grid grid-cols-1 gap-2 sm:flex">
      {field("style", [
        { value: "all", label: "Todos los estilos" },
        { value: "realistic", label: "Realista" },
        { value: "anime", label: "Anime" },
        { value: "cyberpunk", label: "Cyberpunk" },
        { value: "3d", label: "3D Render" },
      ])}
      {field("gender", [
        { value: "all", label: "Todos los géneros" },
        { value: "female", label: "Femenino" },
        { value: "male", label: "Masculino" },
        { value: "nonbinary", label: "No binario" },
      ])}
      {field("age", [
        { value: "all", label: "Todas las edades" },
        { value: "young", label: "Joven" },
        { value: "adult", label: "Adulto" },
        { value: "senior", label: "Senior" },
      ])}
    </div>
  );
}
