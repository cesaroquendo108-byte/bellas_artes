"use client";

import { RotateCcw, Trash2 } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export function InpaintCanvas({ imageUrl }: { imageUrl?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [brush, setBrush] = useState(32);
  const [view, setView] = useState<"original" | "mask" | "preview">("preview");
  const [prompt, setPrompt] = useState("");

  function point(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (800 / rect.width),
      y: (event.clientY - rect.top) * (800 / rect.height),
    };
  }
  function clear() {
    const canvas = canvasRef.current;
    canvas?.getContext("2d")?.clearRect(0, 0, 800, 800);
    setHistory([]);
  }
  function undo() {
    const canvas = canvasRef.current;
    const previous = history.at(-1);
    const context = canvas?.getContext("2d");
    if (!canvas || !context || previous === undefined) return;
    context.clearRect(0, 0, 800, 800);
    if (previous) {
      const image = new Image();
      image.onload = () => context.drawImage(image, 0, 0);
      image.src = previous;
    }
    setHistory((items) => items.slice(0, -1));
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
      <div
        className={cn(
          "relative aspect-square overflow-hidden rounded-xl border border-white/10 bg-black",
          view === "mask" && "bg-black",
        )}
        style={
          view !== "mask" && imageUrl
            ? {
                backgroundImage: `url(${imageUrl})`,
                backgroundSize: "contain",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
              }
            : undefined
        }
      >
        <canvas
          ref={canvasRef}
          width={800}
          height={800}
          aria-label="Lienzo de máscara para inpaint"
          className={cn(
            "size-full touch-none cursor-crosshair transition-opacity",
            view === "original" && "pointer-events-none opacity-0",
          )}
          onPointerDown={(event) => {
            const context = event.currentTarget.getContext("2d");
            if (!context) return;
            setHistory((items) => [...items, event.currentTarget.toDataURL()]);
            const spot = point(event);
            context.beginPath();
            context.moveTo(spot.x, spot.y);
            context.lineWidth = brush;
            context.lineCap = "round";
            context.strokeStyle = "rgba(139,92,246,.6)";
            setDrawing(true);
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (!drawing) return;
            const context = event.currentTarget.getContext("2d");
            if (!context) return;
            const spot = point(event);
            context.lineTo(spot.x, spot.y);
            context.stroke();
          }}
          onPointerUp={() => setDrawing(false)}
          onPointerCancel={() => setDrawing(false)}
        />
        <div className="absolute top-2 left-2 flex rounded-lg border border-white/10 bg-black/70 p-1">
          {(["original", "mask", "preview"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setView(mode)}
              className={cn(
                "rounded-md px-2 py-1 text-[9px] capitalize",
                view === mode ? "bg-violet-500 text-white" : "text-slate-400",
              )}
            >
              {mode === "mask" ? "Máscara" : mode}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-[10px]">
            <Label>Tamaño de pincel</Label>
            <span>{brush}px</span>
          </div>
          <Slider
            value={[brush]}
            min={6}
            max={100}
            onValueChange={(value) =>
              setBrush(Array.isArray(value) ? value[0] : value)
            }
          />
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!history.length}
            onClick={undo}
          >
            <RotateCcw /> Undo
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={clear}>
            <Trash2 /> Limpiar
          </Button>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Prompt de reemplazo</Label>
          <Textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Describe lo que debe aparecer en la máscara…"
            className="min-h-28"
          />
        </div>
        <Button
          type="button"
          disabled
          className="w-full bg-violet-600 text-white"
        >
          Generar selección
        </Button>
        <p className="text-[10px] leading-4 text-slate-600">
          La máscara permanece local y no se envía a un worker.
        </p>
      </div>
    </div>
  );
}
