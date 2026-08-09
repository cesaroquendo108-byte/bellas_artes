"use client";

import { LayoutPanelTop, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

import { useStoryProject } from "./story-project-context";
import { StoryboardSceneCard } from "./storyboard-scene-card";

export function StoryboardCanvas() {
  const { state, dispatch } = useStoryProject();
  if (!state.document.scenes.length)
    return (
      <div className="flex min-h-[55vh] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 text-center">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-violet-500/10">
          <LayoutPanelTop className="size-7 text-violet-300" />
        </div>
        <h2 className="mt-5 text-lg font-semibold">Tu storyboard está vacío</h2>
        <p className="mt-2 max-w-md text-xs leading-5 text-slate-600">
          Crea una escena para comenzar a organizar shots, prompts y recursos
          reales.
        </p>
        <Button
          type="button"
          className="mt-5 bg-violet-600 text-white"
          onClick={() =>
            dispatch({
              type: "add_scene",
              sceneId: crypto.randomUUID(),
              shotId: crypto.randomUUID(),
            })
          }
        >
          <Plus /> Crear primera escena
        </Button>
      </div>
    );
  return (
    <div className="space-y-4">
      {state.document.scenes.map((scene, index) => (
        <StoryboardSceneCard
          key={scene.id}
          scene={scene}
          index={index}
          total={state.document.scenes.length}
        />
      ))}
      <Button
        type="button"
        variant="outline"
        className="w-full border-dashed border-white/10 text-slate-400"
        onClick={() =>
          dispatch({
            type: "add_scene",
            sceneId: crypto.randomUUID(),
            shotId: crypto.randomUUID(),
          })
        }
      >
        <Plus /> Añadir escena
      </Button>
    </div>
  );
}
