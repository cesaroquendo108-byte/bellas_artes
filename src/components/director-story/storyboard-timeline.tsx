"use client";

import { Clock3, Film } from "lucide-react";

import { useStoryProject } from "./story-project-context";

export function StoryboardTimeline() {
  const { state } = useStoryProject();
  const total = state.document.scenes.reduce(
    (sum, scene) => sum + scene.durationSeconds,
    0,
  );
  return (
    <div className="min-h-[55vh] rounded-2xl border border-[#e6ded1] bg-white p-4 shadow-sm sm:p-6">
      <div className="flex items-center gap-2">
        <Clock3 className="size-4 text-violet-700" />
        <h2 className="text-sm font-semibold">Línea de tiempo</h2>
        <span className="ml-auto text-xs text-[#817887]">
          {total.toFixed(1)} segundos
        </span>
      </div>
      {state.document.scenes.length ? (
        <div className="mt-8 space-y-5">
          {state.document.scenes.map((scene, index) => (
            <div key={scene.id}>
              <div className="mb-2 flex items-center gap-2 text-[10px]">
                <span className="text-violet-700">Escena {index + 1}</span>
                <span className="text-[#6f6878]">{scene.title}</span>
                <span className="ml-auto text-[#817887]">
                  {scene.durationSeconds.toFixed(1)}s
                </span>
              </div>
              <div className="flex min-h-16 gap-1 overflow-x-auto rounded-xl border border-[#eee7dc] bg-[#fcfaf5] p-2">
                {scene.shots.map((shot) => (
                  <div
                    key={shot.id}
                    className="relative min-w-24 flex-1 overflow-hidden rounded-lg border border-violet-200 bg-gradient-to-br from-violet-100 to-fuchsia-50 p-2"
                    style={{ flexGrow: Math.max(1, shot.durationSeconds) }}
                  >
                    <Film className="size-3 text-violet-700" />
                    <p className="mt-2 truncate text-[9px] text-[#3b3344]">
                      {shot.title}
                    </p>
                    <p className="text-[8px] text-[#817887]">
                      {shot.durationSeconds}s
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex min-h-80 items-center justify-center text-xs text-[#817887]">
          Añade escenas para construir la línea de tiempo.
        </div>
      )}
    </div>
  );
}
