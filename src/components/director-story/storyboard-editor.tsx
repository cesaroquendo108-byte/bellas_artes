"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Cloud,
  CloudOff,
  Film,
  LayoutPanelTop,
  LoaderCircle,
  MonitorPlay,
  Save,
  Sparkles,
  Timer,
} from "lucide-react";
import { useEffect, useMemo, useRef } from "react";

import { Badge } from "@/components/ui/badge";
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
import {
  storyDocumentSchema,
  type CreativeProject,
  type CreativeProjectKind,
  type StoryAssetOption,
  type StoryTemplate,
} from "@/lib/story/contracts";
import { cn } from "@/lib/utils";

import { StoryboardCanvas } from "./storyboard-canvas";
import {
  StoryProjectProvider,
  useStoryProject,
  type StoryEditorView,
} from "./story-project-context";
import { StoryboardTimeline } from "./storyboard-timeline";

function EditorWorkspace() {
  const { state, dispatch, assets } = useStoryProject();
  const first = useRef(true);
  const total = useMemo(
    () =>
      state.document.scenes.reduce(
        (sum, scene) => sum + scene.durationSeconds,
        0,
      ),
    [state.document],
  );
  const incomplete = state.document.scenes.filter(
    (scene) =>
      !scene.shots.length || scene.shots.some((shot) => !shot.prompt.trim()),
  ).length;
  useEffect(() => {
    if (first.current) {
      first.current = false;
      if (!state.projectId) {
        try {
          const raw = localStorage.getItem("bellas-artes-story-draft:new");
          if (raw) {
            const saved = JSON.parse(raw) as {
              title?: string;
              description?: string;
              storyType?: StoryTemplate;
              coverAssetId?: string | null;
              document?: unknown;
            };
            const parsed = storyDocumentSchema.safeParse(saved.document);
            if (parsed.success)
              dispatch({
                type: "hydrate",
                value: {
                  title: saved.title,
                  description: saved.description,
                  storyType: saved.storyType,
                  coverAssetId: saved.coverAssetId,
                  document: parsed.data,
                },
              });
          }
        } catch {}
      }
      return;
    }
  }, [dispatch, state.projectId]);
  useEffect(() => {
    const key = `bellas-artes-story-draft:${state.projectId ?? "new"}`;
    localStorage.setItem(
      key,
      JSON.stringify({
        title: state.title,
        description: state.description,
        storyType: state.storyType,
        coverAssetId: state.coverAssetId,
        document: state.document,
      }),
    );
  }, [
    state.coverAssetId,
    state.description,
    state.document,
    state.projectId,
    state.storyType,
    state.title,
  ]);
  useEffect(() => {
    if (!state.dirty) return;
    const timer = window.setTimeout(async () => {
      dispatch({ type: "save_start" });
      const payload = {
        title: state.title,
        description: state.description || null,
        storyType: state.storyType,
        coverAssetId: state.coverAssetId,
        document: state.document,
        metadata: { editor: "storyboard-v1" },
      };
      try {
        const response = await fetch(
          state.projectId
            ? `/api/story/projects/${state.projectId}`
            : "/api/story/projects",
          {
            method: state.projectId ? "PATCH" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(
              state.projectId ? payload : { ...payload, kind: state.kind },
            ),
          },
        );
        const body = (await response.json()) as {
          project?: CreativeProject;
          message?: string;
        };
        if (!response.ok || !body.project)
          throw new Error(body.message ?? "No se pudo guardar.");
        dispatch({ type: "save_success", projectId: body.project.id });
        if (!state.projectId) {
          localStorage.removeItem("bellas-artes-story-draft:new");
          window.history.replaceState(
            null,
            "",
            `/story/create?project=${body.project.id}`,
          );
        }
      } catch {
        dispatch({
          type: "save_error",
          message:
            "No se pudo sincronizar. El borrador permanece guardado localmente.",
        });
      }
    }, 900);
    return () => window.clearTimeout(timer);
  }, [
    dispatch,
    state.coverAssetId,
    state.description,
    state.dirty,
    state.document,
    state.kind,
    state.projectId,
    state.storyType,
    state.title,
  ]);
  const saveIcon =
    state.saveState === "saving"
      ? LoaderCircle
      : state.saveState === "saved"
        ? Check
        : state.saveState === "error"
          ? CloudOff
          : state.saveState === "local"
            ? Save
            : Cloud;
  const SaveIcon = saveIcon;
  return (
    <div className="story-editor min-h-[calc(100dvh-1rem)] bg-[#fcfaf5] text-[#241f2e]">
      <header className="sticky top-0 z-30 border-b border-[#e6ded1] bg-[#fffdf8]/95 shadow-sm backdrop-blur-xl">
        <div className="flex items-center gap-3 px-3 py-4 sm:px-5">
          <Button
            render={
              <Link
                href={
                  state.kind === "director" ? "/director/projects" : "/story/my"
                }
              />
            }
            nativeButton={false}
            variant="ghost"
            size="icon-sm"
          >
            <ArrowLeft />
            <span className="sr-only">Volver</span>
          </Button>
          <div className="min-w-0 flex-1">
            <Input
              value={state.title}
              onChange={(event) =>
                dispatch({
                  type: "set_field",
                  field: "title",
                  value: event.target.value,
                })
              }
            className="h-8 border-0 bg-transparent px-0 text-base font-semibold text-[#241f2e] placeholder:text-[#a097a4]"
            />
            <p className="hidden text-[10px] text-[#817887] sm:block">
              {state.kind === "director" ? "Proyecto de director" : "Proyecto de historia"}{" "}
              · {state.projectId ? "Supabase" : "Nuevo borrador"}
            </p>
          </div>
          <span
            className={cn(
              "flex items-center gap-1 text-[10px]",
              state.saveState === "error" ? "text-rose-600" : "text-[#6f6878]",
            )}
          >
            <SaveIcon
              className={cn(
                "size-3",
                state.saveState === "saving" && "animate-spin",
              )}
            />
            {state.saveState === "saving"
              ? "Guardando"
              : state.saveState === "saved"
                ? "Guardado"
                : state.saveState === "error"
                  ? "Error"
                  : state.saveState === "local"
                    ? "Borrador local"
                    : "Sin cambios"}
          </span>
          <Badge
            variant="outline"
            className="border-violet-200 bg-violet-50 text-violet-700"
          >
            Beta
          </Badge>
        </div>
        <div className="flex gap-1 overflow-x-auto border-t border-[#eee7dc] px-3 py-3 sm:px-5">
          {(
            [
              {
                value: "storyboard",
                label: "Storyboard",
                icon: LayoutPanelTop,
              },
              { value: "timeline", label: "Línea de tiempo", icon: Film },
              { value: "preview", label: "Vista previa", icon: MonitorPlay },
            ] as const
          ).map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() =>
                dispatch({ type: "set_field", field: "view", value })
              }
              className={cn(
                "flex min-w-fit items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium transition",
                state.view === value
                  ? "bg-violet-600 text-white"
                  : "text-[#6f6878] hover:bg-violet-50 hover:text-violet-700",
              )}
            >
              <Icon className="size-3" />
              {label}
            </button>
          ))}
          <span className="ml-auto flex min-w-fit items-center gap-1 px-2 text-[10px] text-[#817887]">
            <Timer className="size-3" />
            {total.toFixed(1)}s · {state.document.scenes.length} escenas
          </span>
        </div>
      </header>
      <div className="grid min-h-0 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="border-r border-[#e6ded1] bg-[#fffdf8] p-4 lg:min-h-[calc(100dvh-110px)]">
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-medium text-[#6f6878]">
                Tipo de historia
              </Label>
              <Select
                value={state.storyType}
                onValueChange={(value) =>
                  value &&
                  dispatch({ type: "set_field", field: "storyType", value })
                }
              >
                <SelectTrigger className="mt-2 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="music-video">Videoclip</SelectItem>
                  <SelectItem value="explainer">Explicador</SelectItem>
                  <SelectItem value="character-vlog">Vlog de personaje</SelectItem>
                  <SelectItem value="asmr">ASMR</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-medium text-[#6f6878]">Descripción</Label>
              <Textarea
                value={state.description}
                onChange={(event) =>
                  dispatch({
                    type: "set_field",
                    field: "description",
                    value: event.target.value,
                  })
                }
                placeholder="Sinopsis y objetivo narrativo…"
                className="mt-2 min-h-24"
              />
            </div>
            <div>
              <Label className="text-xs font-medium text-[#6f6878]">Portada</Label>
              <Select
                value={state.coverAssetId}
                onValueChange={(value) =>
                  dispatch({ type: "set_field", field: "coverAssetId", value })
                }
              >
                <SelectTrigger className="mt-2 w-full">
                  <SelectValue placeholder="Elegir recurso" />
                </SelectTrigger>
                <SelectContent>
                  {assets
                    .filter(
                      (asset) =>
                        asset.type === "image" || asset.type === "video",
                    )
                    .map((asset) => (
                      <SelectItem key={asset.id} value={asset.id}>
                        {asset.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-xl border border-[#e6ded1] bg-white p-3 text-[10px]">
              <div className="flex justify-between">
                <span className="text-[#6f6878]">Escenas incompletas</span>
                <span
                  className={incomplete ? "text-amber-300" : "text-emerald-300"}
                >
                  {incomplete}
                </span>
              </div>
              <div className="mt-2 flex justify-between">
                <span className="text-[#6f6878]">Recursos disponibles</span>
                <span className="text-[#3b3344]">{assets.length}</span>
              </div>
            </div>
            <Button
              type="button"
              disabled
              className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white"
            >
              <Sparkles /> Generar historia
            </Button>
            <p className="text-[10px] leading-4 text-[#817887]">
              Próximamente: la generación se conectará a los estudios de Imagen,
              Video y Audio.
            </p>
          </div>
        </aside>
        <main className="min-w-0 p-3 sm:p-5 lg:p-6">
          {state.message && (
            <div
              role="status"
              className={cn(
                "mb-4 rounded-xl border p-3 text-xs",
                state.saveState === "error"
                  ? "border-rose-200 bg-rose-50 text-rose-700"
                  : "border-violet-200 bg-violet-50 text-violet-700",
              )}
            >
              {state.message}
            </div>
          )}
          {state.view === "storyboard" && <StoryboardCanvas />}
          {state.view === "timeline" && <StoryboardTimeline />}
          {state.view === "preview" && (
            <div className="min-h-[55vh] rounded-2xl border border-[#e6ded1] bg-white p-5 shadow-sm">
              <div className="mx-auto max-w-3xl">
                <Badge className="border-violet-200 bg-violet-50 text-violet-700">
                  Vista previa estructural
                </Badge>
                <h2 className="mt-4 text-2xl font-semibold">{state.title}</h2>
                <p className="mt-2 text-sm leading-6 text-[#6f6878]">
                  {state.description || "Sin descripción."}
                </p>
                <div className="mt-8 space-y-4">
                  {state.document.scenes.map((scene, index) => (
                    <div
                      key={scene.id}
                      className="rounded-xl border border-[#e6ded1] bg-[#fffdf8] p-4"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold">
                          {index + 1}. {scene.title}
                        </h3>
                        <span className="text-[10px] text-[#817887]">
                          {scene.durationSeconds.toFixed(1)}s
                        </span>
                      </div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {scene.shots.map((shot) => (
                          <div
                            key={shot.id}
                            className="rounded-lg border border-[#eee7dc] bg-white p-3"
                          >
                            <p className="text-[10px] font-medium text-violet-700">
                              {shot.title}
                            </p>
                            <p className="mt-1 line-clamp-3 text-[9px] leading-4 text-[#817887]">
                              {shot.prompt || "Descripción pendiente"}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {!state.document.scenes.length && (
                    <p className="py-20 text-center text-xs text-[#817887]">
                      No hay escenas que previsualizar.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export function StoryboardEditor({
  project,
  assets,
  template = "custom",
  kind = "story",
  initialView = "storyboard",
  initialPrompt = "",
}: {
  project?: CreativeProject | null;
  assets: StoryAssetOption[];
  template?: StoryTemplate;
  kind?: CreativeProjectKind;
  initialView?: StoryEditorView;
  initialPrompt?: string;
}) {
  return (
    <StoryProjectProvider
      project={project}
      assets={assets}
      template={template}
      kind={kind}
      initialView={initialView}
      initialPrompt={initialPrompt}
    >
      <EditorWorkspace />
    </StoryProjectProvider>
  );
}
