"use client";

import { RotateCcw, Trash2 } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function VideoMaskCanvas({ brushSize }: { brushSize: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [view, setView] = useState<"original" | "mask" | "preview">("preview");

  function point(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  function clear() {
    const canvas = canvasRef.current;
    canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    setHistory([]);
  }

  function undo() {
    const canvas = canvasRef.current;
    const previous = history.at(-1);
    if (!canvas || previous === undefined) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    if (previous) {
      const image = new Image();
      image.onload = () => context.drawImage(image, 0, 0);
      image.src = previous;
    }
    setHistory((items) => items.slice(0, -1));
  }

  return (
    <div className={cn("absolute inset-0 z-10", view === "mask" && "bg-black")}>
      <canvas
        ref={canvasRef}
        width={960}
        height={540}
        className={cn(
          "size-full touch-none cursor-crosshair transition-opacity",
          view === "original" && "pointer-events-none opacity-0",
        )}
        aria-label="Lienzo para pintar la máscara del personaje"
        onPointerDown={(event) => {
          const canvas = canvasRef.current;
          const context = canvas?.getContext("2d");
          if (!canvas || !context) return;
          setHistory((items) => [...items, canvas.toDataURL()]);
          const { x, y } = point(event);
          context.beginPath();
          context.moveTo(x, y);
          context.lineCap = "round";
          context.lineJoin = "round";
          context.lineWidth = brushSize;
          context.strokeStyle = "rgba(139, 92, 246, 0.55)";
          setDrawing(true);
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!drawing) return;
          const context = canvasRef.current?.getContext("2d");
          if (!context) return;
          const { x, y } = point(event);
          context.lineTo(x, y);
          context.stroke();
        }}
        onPointerUp={() => setDrawing(false)}
        onPointerCancel={() => setDrawing(false)}
      />
      <div className="absolute top-3 left-3 flex gap-1 rounded-lg border border-white/10 bg-black/70 p-1 backdrop-blur">
        {(["original", "mask", "preview"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setView(mode)}
            className={cn(
              "rounded-md px-2 py-1 text-[9px] capitalize transition",
              view === mode
                ? "bg-violet-500 text-white"
                : "text-slate-400 hover:text-white",
            )}
          >
            {mode === "mask" ? "Máscara" : mode}
          </button>
        ))}
      </div>
      <div className="absolute top-3 right-3 flex gap-1 rounded-lg border border-white/10 bg-black/70 p-1 backdrop-blur">
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          disabled={!history.length}
          onClick={undo}
          aria-label="Deshacer trazo"
        >
          <RotateCcw className="size-3.5" />
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          onClick={clear}
          aria-label="Limpiar máscara"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
