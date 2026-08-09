"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { StoryScene } from "@/lib/story/contracts";

import { useStoryProject } from "./story-project-context";
import { StoryboardShotCard } from "./storyboard-shot-card";

export function StoryboardSceneCard({
  scene,
  index,
  total,
}: {
  scene: StoryScene;
  index: number;
  total: number;
}) {
  const { dispatch } = useStoryProject();
  return (
    <section className="rounded-2xl border border-white/[0.08] bg-[#0d0d10] p-3 sm:p-4">
      <header className="flex flex-wrap items-center gap-2">
        <Badge className="bg-violet-500/10 text-violet-300">
          Escena {index + 1}
        </Badge>
        <Input
          value={scene.title}
          onChange={(event) =>
            dispatch({
              type: "update_scene",
              sceneId: scene.id,
              field: "title",
              value: event.target.value,
            })
          }
          className="h-8 min-w-40 flex-1 border-0 bg-transparent px-1 text-sm font-semibold"
        />
        <span className="text-[10px] text-slate-600">
          {scene.durationSeconds.toFixed(1)}s
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={index === 0}
          onClick={() =>
            dispatch({ type: "move_scene", sceneId: scene.id, direction: -1 })
          }
        >
          <ArrowUp />
          <span className="sr-only">Mover escena arriba</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={index === total - 1}
          onClick={() =>
            dispatch({ type: "move_scene", sceneId: scene.id, direction: 1 })
          }
        >
          <ArrowDown />
          <span className="sr-only">Mover escena abajo</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => dispatch({ type: "remove_scene", sceneId: scene.id })}
        >
          <Trash2 className="text-rose-400" />
          <span className="sr-only">Eliminar escena</span>
        </Button>
      </header>
      <Textarea
        value={scene.notes}
        onChange={(event) =>
          dispatch({
            type: "update_scene",
            sceneId: scene.id,
            field: "notes",
            value: event.target.value,
          })
        }
        placeholder="Notas de dirección para esta escena…"
        className="mt-3 min-h-16"
      />
      <div className="mt-3 space-y-3">
        {scene.shots.map((shot, shotIndex) => (
          <StoryboardShotCard
            key={shot.id}
            scene={scene}
            shot={shot}
            index={shotIndex}
          />
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full border-dashed border-white/10 text-slate-400"
          onClick={() =>
            dispatch({
              type: "add_shot",
              sceneId: scene.id,
              shotId: crypto.randomUUID(),
            })
          }
        >
          <Plus /> Añadir plano
        </Button>
      </div>
    </section>
  );
}
