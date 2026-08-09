"use client";

import { DoorOpen } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import type { CharacterWorldAsset } from "./types";

export function WorldCard({ asset }: { asset: CharacterWorldAsset }) {
  return (
    <Dialog>
      <article className="group">
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#121214] transition hover:border-violet-400/40 hover:shadow-xl hover:shadow-violet-950/30">
          <div
            className="aspect-square bg-cover bg-center transition duration-500 group-hover:scale-105"
            style={{ backgroundImage: `url(${asset.signedUrl})` }}
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/65 opacity-0 backdrop-blur-sm transition group-hover:opacity-100">
            <DialogTrigger
              render={
                <Button
                  type="button"
                  className="rounded-full bg-violet-600 text-white"
                />
              }
            >
              <DoorOpen /> Entrar
            </DialogTrigger>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <h3 className="min-w-0 flex-1 truncate text-xs text-slate-300">
            {asset.name}
          </h3>
          {asset.style && (
            <Badge
              variant="outline"
              className="border-white/10 text-[8px] text-slate-500"
            >
              {asset.style}
            </Badge>
          )}
        </div>
      </article>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{asset.name}</DialogTitle>
          <DialogDescription>
            Vista previa del mundo y metadatos guardados.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 aspect-video overflow-hidden rounded-xl bg-black">
          <div
            className="size-full bg-contain bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${asset.signedUrl})` }}
          />
        </div>
        <div className="mt-4 grid gap-3 text-xs sm:grid-cols-3">
          <div>
            <p className="text-slate-600">Modelo</p>
            <p className="mt-1 text-slate-300">
              {asset.model ?? "No registrado"}
            </p>
          </div>
          <div>
            <p className="text-slate-600">Semilla</p>
            <p className="mt-1 text-slate-300">
              {asset.seed ?? "No registrada"}
            </p>
          </div>
          <div>
            <p className="text-slate-600">Etiquetas</p>
            <p className="mt-1 text-slate-300">
              {asset.labels.join(", ") || "Sin etiquetas"}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
