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
    <div className="min-h-[calc(100dvh-1rem)] bg-[#080809] text-white">
      <header className="sticky top-0 z-30 border-b border-white/[0.07] bg-[#0b0b0d]/95 backdrop-blur-xl">
        <div className="flex items-center gap-3 px-3 py-3 sm:px-5">
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
              className="h-7 border-0 bg-transparent px-0 text-sm font-semibold"
            />
            <p className="hidden text-[9px] text-slate-600 sm:block">
              {state.kind === "director" ? "Proyecto de director" : "Proyecto de historia"}{" "}
              · {state.projectId ? "Supabase" : "Nuevo borrador"}
            </p>
          </div>
          <span
            className={cn(
              "flex items-center gap-1 text-[9px]",
              state.saveState === "error" ? "text-rose-300" : "text-slate-500",
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
            className="border-violet-400/20 text-violet-300"
          >
            Beta
          </Badge>
        </div>
        <div className="flex gap-1 overflow-x-auto px-3 pb-3 sm:px-5">
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
                "flex min-w-fit items-center gap-1 rounded-lg px-3 py-2 text-[10px]",
                state.view === value
                  ? "bg-violet-600 text-white"
                  : "text-slate-500 hover:bg-white/[0.05]",
              )}
            >
              <Icon className="size-3" />
              {label}
            </button>
          ))}
          <span className="ml-auto flex min-w-fit items-center gap-1 px-2 text-[9px] text-slate-600">
            <Timer className="size-3" />
            {total.toFixed(1)}s · {state.document.scenes.length} escenas
          </span>
        </div>
      </header>
      <div className="grid min-h-0 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="border-r border-white/[0.07] bg-[#0d0d10] p-4 lg:min-h-[calc(100dvh-110px)]">
          <div className="space-y-4">
            <div>
              <Label className="text-[10px] text-slate-500">
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
              <Label className="text-[10px] text-slate-500">Descripción</Label>
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
              <Label className="text-[10px] text-slate-500">Portada</Label>
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
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 text-[10px]">
              <div className="flex justify-between">
                <span className="text-slate-500">Escenas incompletas</span>
                <span
                  className={incomplete ? "text-amber-300" : "text-emerald-300"}
                >
                  {incomplete}
                </span>
              </div>
              <div className="mt-2 flex justify-between">
                <span className="text-slate-500">Recursos disponibles</span>
                <span className="text-slate-300">{assets.length}</span>
              </div>
            </div>
            <Button
              type="button"
              disabled
              className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white"
            >
              <Sparkles /> Generar historia
            </Button>
            <p className="text-[9px] leading-4 text-slate-600">
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
                  ? "border-rose-400/20 bg-rose-500/10 text-rose-200"
                  : "border-violet-400/20 bg-violet-500/10 text-violet-200",
              )}
            >
              {state.message}
            </div>
          )}
          {state.view === "storyboard" && <StoryboardCanvas />}
          {state.view === "timeline" && <StoryboardTimeline />}
          {state.view === "preview" && (
            <div className="min-h-[55vh] rounded-2xl border border-white/[0.08] bg-black p-5">
              <div className="mx-auto max-w-3xl">
                <Badge className="bg-violet-500/10 text-violet-300">
                  Vista previa estructural
                </Badge>
                <h2 className="mt-4 text-2xl font-semibold">{state.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {state.description || "Sin descripción."}
                </p>
                <div className="mt-8 space-y-4">
                  {state.document.scenes.map((scene, index) => (
                    <div
                      key={scene.id}
                      className="rounded-xl border border-white/[0.08] p-4"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold">
                          {index + 1}. {scene.title}
                        </h3>
                        <span className="text-[10px] text-slate-600">
                          {scene.durationSeconds.toFixed(1)}s
                        </span>
                      </div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {scene.shots.map((shot) => (
                          <div
                            key={shot.id}
                            className="rounded-lg bg-white/[0.035] p-3"
                          >
                            <p className="text-[10px] font-medium text-violet-200">
                              {shot.title}
                            </p>
                            <p className="mt-1 line-clamp-3 text-[9px] leading-4 text-slate-600">
                              {shot.prompt || "Descripción pendiente"}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {!state.document.scenes.length && (
                    <p className="py-20 text-center text-xs text-slate-600">
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
