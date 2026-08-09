"use client";

import {
  Download,
  FolderOpen,
  Grid3X3,
  History,
  PackageOpen,
} from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { CharacterWorldAsset } from "./types";

export function CharacterHistory({
  assets,
}: {
  assets: CharacterWorldAsset[];
}) {
  const [tab, setTab] = useState<"history" | "expressions" | "export">(
    "history",
  );
  const characters = assets.filter(
    (asset) => asset.kind === "character" && asset.type === "image",
  );
  return (
    <aside className="min-h-0 border-l border-white/[0.07] bg-[#0d0d10]">
      <div className="flex gap-1 overflow-x-auto border-b border-white/[0.07] p-2">
        {(
          [
            { value: "history", label: "Historial", icon: History },
            { value: "expressions", label: "Expresiones", icon: Grid3X3 },
            { value: "export", label: "Exportar", icon: PackageOpen },
          ] as const
        ).map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={cn(
              "flex min-w-fit items-center gap-1 rounded-lg px-2 py-2 text-[9px]",
              tab === value ? "bg-violet-500 text-white" : "text-slate-500",
            )}
          >
            <Icon className="size-3" />
            {label}
          </button>
        ))}
      </div>
      <div className="max-h-96 overflow-y-auto p-3 lg:max-h-none">
        {tab === "history" && (
          <div className="grid grid-cols-2 gap-2">
            {characters.map((asset) => (
              <div
                key={asset.id}
                className="overflow-hidden rounded-lg border border-white/[0.07]"
              >
                <div
                  className="aspect-square bg-cover bg-center"
                  style={{ backgroundImage: `url(${asset.signedUrl})` }}
                />
                <p className="truncate p-2 text-[9px] text-slate-400">
                  {asset.name}
                </p>
              </div>
            ))}
            {characters.length === 0 && (
              <div className="col-span-full flex min-h-48 flex-col items-center justify-center text-center">
                <FolderOpen className="size-6 text-slate-700" />
                <p className="mt-3 text-xs text-slate-500">
                  Sin iteraciones reales
                </p>
              </div>
            )}
          </div>
        )}
        {tab === "expressions" && (
          <div>
            <div className="grid grid-cols-2 gap-2">
              {[
                "Sonriente",
                "Enojado",
                "Pensativo",
                "Sorprendido",
                "Frente",
                "Perfil 3/4",
                "Espalda",
                "Action Pose",
              ].map((label) => (
                <div
                  key={label}
                  className="flex aspect-square items-end rounded-lg border border-dashed border-white/10 bg-white/[0.02] p-2"
                >
                  <span className="text-[9px] text-slate-600">{label}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[9px] leading-4 text-slate-600">
              Las celdas son objetivos de generación, no resultados simulados.
            </p>
          </div>
        )}
        {tab === "export" && (
          <div className="space-y-3">
            {["PNG + Metadata", "Character Card V2 JSON", "Turnaround ZIP"].map(
              (format) => (
                <div
                  key={format}
                  className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3"
                >
                  <Badge
                    variant="outline"
                    className="border-white/10 text-[9px] text-slate-400"
                  >
                    {format}
                  </Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled
                    className="mt-3 w-full"
                  >
                    <Download /> Preparar exportación
                  </Button>
                </div>
              ),
            )}
            <p className="text-[9px] leading-4 text-slate-600">
              La exportación se activará al existir una entidad persistida.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
