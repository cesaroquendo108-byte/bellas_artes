"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function BrandColorPalette({
  colors,
  onChange,
}: {
  colors: string[];
  onChange: (colors: string[]) => void;
}) {
  const [value, setValue] = useState("#8B5CF6");
  const valid = /^#[0-9a-fA-F]{6}$/.test(value);
  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {colors.map((color, index) => (
          <div key={`${color}-${index}`} className="group relative">
            <input
              type="color"
              value={color}
              onChange={(event) =>
                onChange(
                  colors.map((item, itemIndex) =>
                    itemIndex === index
                      ? event.target.value.toUpperCase()
                      : item,
                  ),
                )
              }
              className="block size-14 cursor-pointer overflow-hidden rounded-full border border-white/20 bg-transparent p-0 shadow-lg shadow-black/50"
              title={`Editar ${color}`}
              aria-label={`Editar ${color}`}
            />
            <button
              type="button"
              onClick={() =>
                onChange(colors.filter((_, item) => item !== index))
              }
              className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-rose-600 text-white opacity-0 transition group-hover:opacity-100"
              aria-label={`Eliminar ${color}`}
            >
              <Trash2 className="size-3" />
            </button>
            <p className="mt-2 text-center font-mono text-[9px] text-slate-600">
              {color}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-6 flex max-w-sm gap-2">
        <Input
          value={value}
          onChange={(event) => setValue(event.target.value.toUpperCase())}
          aria-invalid={Boolean(value) && !valid}
          placeholder="#8B5CF6"
        />
        <Button
          type="button"
          disabled={
            !valid ||
            colors.length >= 12 ||
            colors.includes(value.toUpperCase())
          }
          onClick={() => {
            onChange([...colors, value.toUpperCase()]);
            setValue("#");
          }}
        >
          <Plus /> Añadir
        </Button>
      </div>
      {!valid && value && (
        <p className="mt-2 text-[10px] text-rose-300">
          Usa un código HEX de seis dígitos.
        </p>
      )}
    </div>
  );
}
