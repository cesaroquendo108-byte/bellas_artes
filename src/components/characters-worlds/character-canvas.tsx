"use client";

import {
  Expand,
  Maximize2,
  Minus,
  Paintbrush,
  Plus,
  ScanLine,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { useState } from "react";

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

import { useCharacterBuilder } from "./character-builder-context";
import { InpaintCanvas } from "./inpaint-canvas";
import { PoseEditorCanvas } from "./pose-editor-canvas";

export function CharacterCanvas() {
  const { state, setField } = useCharacterBuilder();
  const [zoom, setZoom] = useState(1);
  const imageUrl =
    state.localReference?.previewUrl ?? state.savedReference?.signedUrl;
  return (
    <section className="flex min-h-[520px] min-w-0 flex-col bg-[#080809] p-4 sm:p-6">
      <div className="flex items-center gap-2">
        <Badge className="border border-violet-400/20 bg-violet-500/10 text-violet-200">
          {state.mode}
        </Badge>
        <span className="text-[10px] text-slate-600">
          {state.aspectRatio} · {state.model}
        </span>
        <Badge
          variant="outline"
          className="ml-auto border-white/10 text-[9px] text-slate-500"
        >
          Vista previa local
        </Badge>
      </div>
      <div className="flex min-h-80 flex-1 items-center justify-center py-5">
        <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-white/[0.08] bg-black shadow-2xl shadow-violet-950/20">
          <div className="aspect-square sm:aspect-[4/3]">
            {imageUrl ? (
              <div
                role="img"
                aria-label="Referencia activa"
                className="size-full bg-contain bg-center bg-no-repeat transition-transform"
                style={{
                  backgroundImage: `url(${imageUrl})`,
                  transform: `scale(${zoom})`,
                }}
              />
            ) : (
              <div className="flex size-full flex-col items-center justify-center px-6 text-center">
                <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600">
                  <Sparkles className="size-7" />
                </div>
                <h2 className="mt-5 text-lg font-semibold">
                  Canvas de consistencia
                </h2>
                <p className="mt-2 max-w-md text-xs leading-5 text-slate-500">
                  Añade una referencia o describe una identidad. Los resultados
                  reales aparecerán aquí cuando se conecte el proveedor.
                </p>
              </div>
            )}
          </div>
          <div className="absolute right-3 bottom-3 flex gap-1 rounded-full border border-white/10 bg-black/70 p-1 backdrop-blur">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setZoom((value) => Math.max(0.7, value - 0.1))}
            >
              <Minus />
            </Button>
            <span className="px-2 py-1.5 text-[9px] text-slate-400">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setZoom((value) => Math.min(1.5, value + 0.1))}
            >
              <Plus />
            </Button>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Dialog>
          <DialogTrigger
            render={
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-white/10 bg-white/[0.03]"
              />
            }
          >
            <ScanLine /> Editar pose
          </DialogTrigger>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Pose Editor</DialogTitle>
              <DialogDescription>
                Arrastra articulaciones para construir una pose local.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              <PoseEditorCanvas />
            </div>
          </DialogContent>
        </Dialog>
        <Dialog>
          <DialogTrigger
            render={
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-white/10 bg-white/[0.03]"
              />
            }
          >
            <Paintbrush /> Inpaint
          </DialogTrigger>
          <DialogContent className="max-w-5xl">
            <DialogHeader>
              <DialogTitle>Inpaint local</DialogTitle>
              <DialogDescription>
                Pinta una máscara y prepara un prompt de reemplazo.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              <InpaintCanvas imageUrl={imageUrl} />
            </div>
          </DialogContent>
        </Dialog>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled
          className="border-white/10"
        >
          <Maximize2 /> Upscale 4K
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled
          className="border-white/10"
        >
          <Expand /> Remove background
        </Button>
      </div>
      <div className="mt-4 rounded-2xl border border-white/[0.08] bg-[#121214]/95 p-3 shadow-xl">
        <textarea
          value={state.prompt}
          onChange={(event) => setField("prompt", event.target.value)}
          placeholder="Describe escena, vestuario, luz y expresión…"
          className="min-h-16 w-full resize-none bg-transparent text-sm outline-none placeholder:text-slate-600"
        />
        <div className="mt-2 flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() =>
              state.prompt &&
              setField(
                "prompt",
                `${state.prompt}, consistent facial identity, detailed character design`,
              )
            }
          >
            <WandSparkles /> Mejorar
          </Button>
          <span className="ml-auto text-[10px] text-slate-600">0 créditos</span>
        </div>
      </div>
      {state.feedback && (
        <div
          role="status"
          className={
            state.feedback.tone === "error"
              ? "mt-3 rounded-xl border border-rose-400/20 bg-rose-500/10 p-3 text-xs text-rose-200"
              : "mt-3 rounded-xl border border-violet-400/20 bg-violet-500/10 p-3 text-xs text-violet-200"
          }
        >
          {state.feedback.message}
        </div>
      )}
    </section>
  );
}
