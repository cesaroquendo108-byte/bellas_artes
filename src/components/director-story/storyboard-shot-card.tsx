"use client";

import { ArrowDown, ArrowUp, Copy, ImagePlus, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { StoryScene, StoryShot } from "@/lib/story/contracts";

import { useStoryProject } from "./story-project-context";

export function StoryboardShotCard({
  scene,
  shot,
  index,
}: {
  scene: StoryScene;
  shot: StoryShot;
  index: number;
}) {
  const { dispatch, assets } = useStoryProject();
  const selected = assets.filter((asset) => shot.assetIds.includes(asset.id));
  return (
    <article className="rounded-xl border border-white/[0.08] bg-[#111114] p-3">
      <div className="flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-lg bg-violet-500/10 text-[10px] font-semibold text-violet-300">
          {index + 1}
        </span>
        <Input
          value={shot.title}
          onChange={(event) =>
            dispatch({
              type: "update_shot",
              sceneId: scene.id,
              shotId: shot.id,
              field: "title",
              value: event.target.value,
            })
          }
          className="h-8 flex-1 border-0 bg-transparent px-1 font-medium"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          disabled={index === 0}
          onClick={() =>
            dispatch({
              type: "move_shot",
              sceneId: scene.id,
              shotId: shot.id,
              direction: -1,
            })
          }
        >
          <ArrowUp />
          <span className="sr-only">Mover arriba</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          disabled={index === scene.shots.length - 1}
          onClick={() =>
            dispatch({
              type: "move_shot",
              sceneId: scene.id,
              shotId: shot.id,
              direction: 1,
            })
          }
        >
          <ArrowDown />
          <span className="sr-only">Mover abajo</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={() =>
            dispatch({
              type: "duplicate_shot",
              sceneId: scene.id,
              shotId: shot.id,
              newId: crypto.randomUUID(),
            })
          }
        >
          <Copy />
          <span className="sr-only">Duplicar shot</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={() =>
            dispatch({
              type: "remove_shot",
              sceneId: scene.id,
              shotId: shot.id,
            })
          }
        >
          <Trash2 className="text-rose-400" />
          <span className="sr-only">Eliminar shot</span>
        </Button>
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_170px]">
        <div className="space-y-2">
          <Label className="text-[10px] text-slate-500">
            Prompt y dirección
          </Label>
          <Textarea
            value={shot.prompt}
            onChange={(event) =>
              dispatch({
                type: "update_shot",
                sceneId: scene.id,
                shotId: shot.id,
                field: "prompt",
                value: event.target.value,
              })
            }
            placeholder="Describe acción, encuadre, luz y emoción…"
            className="min-h-24"
          />
        </div>
        <div className="space-y-3">
          <div>
            <Label className="text-[10px] text-slate-500">Duración</Label>
            <Input
              type="number"
              min={0.5}
              max={600}
              step={0.5}
              value={shot.durationSeconds}
              onChange={(event) =>
                dispatch({
                  type: "update_shot",
                  sceneId: scene.id,
                  shotId: shot.id,
                  field: "durationSeconds",
                  value: Math.max(0.5, Number(event.target.value)),
                })
              }
            />
          </div>
          <div>
            <Label className="text-[10px] text-slate-500">Cámara</Label>
            <Input
              value={shot.camera ?? ""}
              onChange={(event) =>
                dispatch({
                  type: "update_shot",
                  sceneId: scene.id,
                  shotId: shot.id,
                  field: "camera",
                  value: event.target.value || null,
                })
              }
              placeholder="Acercamiento"
            />
          </div>
          <div>
            <Label className="text-[10px] text-slate-500">Transición</Label>
            <Input
              value={shot.transition ?? ""}
              onChange={(event) =>
                dispatch({
                  type: "update_shot",
                  sceneId: scene.id,
                  shotId: shot.id,
                  field: "transition",
                  value: event.target.value || null,
                })
              }
              placeholder="Corte"
            />
          </div>
        </div>
      </div>
      <div className="mt-3">
        <Label className="text-[10px] text-slate-500">
          Recursos vinculados
        </Label>
        <div className="mt-2 flex flex-wrap gap-2">
          {selected.map((asset) => (
            <span
              key={asset.id}
              className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[9px] text-slate-400"
            >
              {asset.name}
              <button
                type="button"
                onClick={() =>
                  dispatch({
                    type: "update_shot",
                    sceneId: scene.id,
                    shotId: shot.id,
                    field: "assetIds",
                    value: shot.assetIds.filter((id) => id !== asset.id),
                  })
                }
              >
                <X className="size-3" />
                <span className="sr-only">Quitar {asset.name}</span>
              </button>
            </span>
          ))}
          <Select
            value={null}
            onValueChange={(id) =>
              id &&
              !shot.assetIds.includes(id) &&
              dispatch({
                type: "update_shot",
                sceneId: scene.id,
                shotId: shot.id,
                field: "assetIds",
                value: [...shot.assetIds, id],
              })
            }
          >
            <SelectTrigger className="h-7 w-auto min-w-40">
              <ImagePlus className="size-3" />
              <SelectValue placeholder="Añadir asset" />
            </SelectTrigger>
            <SelectContent>
              {assets.map((asset) => (
                <SelectItem key={asset.id} value={asset.id}>
                  {asset.name} · {asset.category ?? asset.type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </article>
  );
}
