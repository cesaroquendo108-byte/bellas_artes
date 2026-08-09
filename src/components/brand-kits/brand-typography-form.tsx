"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { BrandKitTypography } from "@/lib/brand-kits/contracts";
const weights = ["100", "200", "300", "400", "500", "600", "700", "800", "900"];
export function BrandTypographyForm({
  value,
  onChange,
}: {
  value: BrandKitTypography;
  onChange: (value: BrandKitTypography) => void;
}) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <div>
        <Label>Tipografía principal</Label>
        <Input
          className="mt-2"
          value={value.primary}
          onChange={(event) =>
            onChange({ ...value, primary: event.target.value })
          }
        />
      </div>
      <div>
        <Label>Tipografía secundaria</Label>
        <Input
          className="mt-2"
          value={value.secondary ?? ""}
          onChange={(event) =>
            onChange({ ...value, secondary: event.target.value || undefined })
          }
        />
      </div>
      <div className="sm:col-span-2">
        <Label>Pesos</Label>
        <div className="mt-3 flex flex-wrap gap-2">
          {weights.map((weight) => {
            const selected = value.weights.includes(weight);
            return (
              <button
                key={weight}
                type="button"
                disabled={selected && value.weights.length === 1}
                onClick={() =>
                  onChange({
                    ...value,
                    weights: selected
                      ? value.weights.filter((item) => item !== weight)
                      : [...value.weights, weight],
                  })
                }
                className={`rounded-lg border px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50 ${selected ? "border-violet-400 bg-violet-500/15 text-violet-200" : "border-white/10 text-slate-500"}`}
              >
                {weight}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
