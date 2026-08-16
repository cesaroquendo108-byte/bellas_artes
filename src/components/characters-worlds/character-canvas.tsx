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
    <section className="flex min-h-[520px] min-w-0 flex-col bg-[#fcfaf5] p-4 text-[#241f2e] sm:p-6">
      <div className="flex items-center gap-2">
        <Badge className="border border-[#ddd1ff] bg-[#f1eaff] text-[#7c3aed]">
          {state.mode}
        </Badge>
        <span className="text-[10px] text-[#8c8393]">
          {state.aspectRatio} · {state.model}
        </span>
        <Badge
          variant="outline"
          className="ml-auto border-[#e6ded1] text-[9px] text-[#817887]"
        >
          Vista previa local
        </Badge>
      </div>
      <div className="flex min-h-80 flex-1 items-center justify-center py-5">
        <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-[#e6ded1] bg-white shadow-[0_12px_30px_rgba(72,53,101,0.08)]">
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
                <h2 className="mt-5 text-lg font-semibold text-[#2b2634]">
                  Canvas de consistencia
                </h2>
                <p className="mt-2 max-w-md text-xs leading-5 text-[#817887]">
                  Añade una referencia o describe una identidad. Los resultados
                  reales aparecerán aquí cuando se conecte el proveedor.
                </p>
              </div>
            )}
          </div>
          <div className="absolute right-3 bottom-3 flex gap-1 rounded-full border border-[#e6ded1] bg-white/95 p-1 shadow-sm backdrop-blur">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-[#574e60] hover:bg-[#f5f0ff] hover:text-[#6d28d9]"
              onClick={() => setZoom((value) => Math.max(0.7, value - 0.1))}
            >
              <Minus />
            </Button>
            <span className="px-2 py-1.5 text-[9px] text-[#817887]">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-[#574e60] hover:bg-[#f5f0ff] hover:text-[#6d28d9]"
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
                className="border-[#e6ded1] bg-white text-[#3a3342] hover:bg-[#f8f4ff]"
              />
            }
          >
            <ScanLine /> Editar pose
          </DialogTrigger>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Editor de poses</DialogTitle>
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
                className="border-[#e6ded1] bg-white text-[#3a3342] hover:bg-[#f8f4ff]"
              />
            }
          >
            <Paintbrush /> Inpaint
          </DialogTrigger>
          <DialogContent className="max-w-5xl">
            <DialogHeader>
              <DialogTitle>Inpaint local</DialogTitle>
              <DialogDescription>
                Pinta una máscara y prepara una descripción de reemplazo.
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
          className="border-[#e6ded1] text-[#9a919f]"
        >
          <Maximize2 /> Upscale 4K
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled
          className="border-[#e6ded1] text-[#9a919f]"
        >
          <Expand /> Remove background
        </Button>
      </div>
      <div className="mt-4 rounded-2xl border border-[#e6ded1] bg-white p-3 shadow-[0_8px_20px_rgba(72,53,101,0.06)]">
        <textarea
          value={state.prompt}
          onChange={(event) => setField("prompt", event.target.value)}
          placeholder="Describe escena, vestuario, luz y expresión…"
          className="min-h-16 w-full resize-none bg-transparent text-sm text-[#2e2837] outline-none placeholder:text-[#9b919f]"
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
          <span className="ml-auto text-[10px] text-[#8d8293]">0 créditos</span>
        </div>
      </div>
      {state.feedback && (
        <div
          role="status"
          className={
            state.feedback.tone === "error"
              ? "mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700"
              : "mt-3 rounded-xl border border-violet-200 bg-violet-50 p-3 text-xs text-violet-700"
          }
        >
          {state.feedback.message}
        </div>
      )}
    </section>
  );
}
