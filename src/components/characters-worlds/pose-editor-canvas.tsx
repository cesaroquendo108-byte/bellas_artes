"use client"

import { RotateCcw, Undo2 } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"

type Point = { x: number; y: number }
const initial: Point[] = [{ x: 300, y: 70 }, { x: 300, y: 135 }, { x: 245, y: 170 }, { x: 355, y: 170 }, { x: 215, y: 245 }, { x: 385, y: 245 }, { x: 265, y: 280 }, { x: 335, y: 280 }, { x: 250, y: 400 }, { x: 350, y: 400 }]
const posePresets = {
  Neutral: initial,
  Contrapposto: [{ x: 300, y: 70 }, { x: 290, y: 135 }, { x: 240, y: 175 }, { x: 345, y: 155 }, { x: 225, y: 255 }, { x: 375, y: 225 }, { x: 260, y: 285 }, { x: 330, y: 275 }, { x: 230, y: 410 }, { x: 370, y: 390 }],
  Action: [{ x: 330, y: 65 }, { x: 300, y: 135 }, { x: 235, y: 145 }, { x: 365, y: 180 }, { x: 175, y: 105 }, { x: 420, y: 235 }, { x: 260, y: 275 }, { x: 335, y: 285 }, { x: 190, y: 360 }, { x: 405, y: 405 }],
} satisfies Record<string, Point[]>
const bones = [[0, 1], [1, 2], [1, 3], [2, 4], [3, 5], [1, 6], [1, 7], [6, 7], [6, 8], [7, 9]]

export function PoseEditorCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [points, setPoints] = useState(initial)
  const [history, setHistory] = useState<Point[][]>([])
  const [dragging, setDragging] = useState<number | null>(null)
  const [preset, setPreset] = useState<keyof typeof posePresets>("Neutral")

  const draw = useCallback((next: Point[]) => {
    const canvas = canvasRef.current; const context = canvas?.getContext("2d"); if (!canvas || !context) return
    context.clearRect(0, 0, canvas.width, canvas.height); context.fillStyle = "#09090b"; context.fillRect(0, 0, canvas.width, canvas.height)
    context.strokeStyle = "rgba(139,92,246,.8)"; context.lineWidth = 7; context.lineCap = "round"
    bones.forEach(([from, to]) => { context.beginPath(); context.moveTo(next[from].x, next[from].y); context.lineTo(next[to].x, next[to].y); context.stroke() })
    next.forEach((point) => { context.beginPath(); context.arc(point.x, point.y, 11, 0, Math.PI * 2); context.fillStyle = "#f5f3ff"; context.fill(); context.strokeStyle = "#8b5cf6"; context.lineWidth = 4; context.stroke() })
  }, [])
  useEffect(() => draw(points), [draw, points])

  function location(event: React.PointerEvent<HTMLCanvasElement>) { const rect = event.currentTarget.getBoundingClientRect(); return { x: (event.clientX - rect.left) * (600 / rect.width), y: (event.clientY - rect.top) * (500 / rect.height) } }

  return <div className="space-y-3"><div className="flex flex-wrap gap-2">{Object.keys(posePresets).map((name) => <Button key={name} type="button" variant={preset === name ? "default" : "outline"} size="sm" onClick={() => { const next = posePresets[name as keyof typeof posePresets]; setHistory((items) => [...items, points.map((point) => ({ ...point }))]); setPoints(next.map((point) => ({ ...point }))); setPreset(name as keyof typeof posePresets) }}>{name}</Button>)}</div><canvas ref={canvasRef} width={600} height={500} className="aspect-[6/5] w-full touch-none rounded-xl border border-white/10" aria-label="Editor de pose con articulaciones arrastrables" onPointerDown={(event) => { const spot = location(event); const index = points.findIndex((point) => Math.hypot(point.x - spot.x, point.y - spot.y) < 28); if (index >= 0) { setHistory((items) => [...items, points.map((point) => ({ ...point }))]); setDragging(index); event.currentTarget.setPointerCapture(event.pointerId) } }} onPointerMove={(event) => { if (dragging === null) return; const spot = location(event); setPoints((items) => items.map((point, index) => index === dragging ? spot : point)) }} onPointerUp={() => setDragging(null)} onPointerCancel={() => setDragging(null)} /><div className="flex gap-2"><Button type="button" variant="outline" size="sm" disabled={!history.length} onClick={() => { const previous = history.at(-1); if (previous) setPoints(previous); setHistory((items) => items.slice(0, -1)) }}><Undo2 /> Deshacer</Button><Button type="button" variant="outline" size="sm" onClick={() => { setPoints(initial.map((point) => ({ ...point }))); setHistory([]); setPreset("Neutral") }}><RotateCcw /> Reset</Button></div></div>
}
