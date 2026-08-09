"use client";

import { createContext, useContext, useMemo, useReducer } from "react";

import type {
  CreativeProject,
  CreativeProjectKind,
  StoryAssetOption,
  StoryDocument,
  StoryShot,
  StoryTemplate,
} from "@/lib/story/contracts";

export type StoryEditorView = "storyboard" | "timeline" | "preview";
export type SaveState = "idle" | "saving" | "saved" | "error" | "local";

export type StoryProjectState = {
  projectId: string | null;
  kind: CreativeProjectKind;
  title: string;
  description: string;
  storyType: StoryTemplate;
  coverAssetId: string | null;
  document: StoryDocument;
  view: StoryEditorView;
  saveState: SaveState;
  message: string | null;
  dirty: boolean;
};

export type StoryProjectAction =
  | {
      type: "set_field";
      field: "title" | "description" | "storyType" | "coverAssetId" | "view";
      value: string | null;
    }
  | {
      type: "hydrate";
      value: Partial<StoryProjectState> & { document: StoryDocument };
    }
  | { type: "add_scene"; sceneId: string; shotId: string }
  | {
      type: "update_scene";
      sceneId: string;
      field: "title" | "notes";
      value: string;
    }
  | { type: "remove_scene"; sceneId: string }
  | { type: "move_scene"; sceneId: string; direction: -1 | 1 }
  | { type: "add_shot"; sceneId: string; shotId: string }
  | { type: "duplicate_shot"; sceneId: string; shotId: string; newId: string }
  | {
      type: "update_shot";
      sceneId: string;
      shotId: string;
      field: keyof Omit<StoryShot, "id" | "order">;
      value: StoryShot[keyof Omit<StoryShot, "id" | "order">];
    }
  | { type: "remove_shot"; sceneId: string; shotId: string }
  | { type: "move_shot"; sceneId: string; shotId: string; direction: -1 | 1 }
  | { type: "save_start" }
  | { type: "save_success"; projectId: string }
  | { type: "save_error"; message: string };

function reindex(document: StoryDocument): StoryDocument {
  return {
    version: 1,
    scenes: document.scenes.map((scene, order) => ({
      ...scene,
      order,
      durationSeconds: Math.max(
        0.5,
        scene.shots.reduce((sum, shot) => sum + shot.durationSeconds, 0) ||
          scene.durationSeconds,
      ),
      shots: scene.shots.map((shot, shotOrder) => ({
        ...shot,
        order: shotOrder,
      })),
    })),
  };
}

function dirty(
  state: StoryProjectState,
  document = state.document,
): StoryProjectState {
  return {
    ...state,
    document: reindex(document),
    dirty: true,
    saveState: state.saveState === "saving" ? "saving" : "idle",
    message: null,
  };
}

export function storyProjectReducer(
  state: StoryProjectState,
  action: StoryProjectAction,
): StoryProjectState {
  if (action.type === "set_field")
    return {
      ...state,
      [action.field]: action.value,
      dirty: action.field !== "view" ? true : state.dirty,
      saveState: action.field !== "view" ? "idle" : state.saveState,
    };
  if (action.type === "hydrate")
    return {
      ...state,
      ...action.value,
      dirty: true,
      saveState: "local",
      message: "Borrador local recuperado; se sincronizará automáticamente.",
    };
  if (action.type === "add_scene")
    return dirty(state, {
      version: 1,
      scenes: [
        ...state.document.scenes,
        {
          id: action.sceneId,
          title: `Escena ${state.document.scenes.length + 1}`,
          order: state.document.scenes.length,
          durationSeconds: 5,
          notes: "",
          shots: [
            {
              id: action.shotId,
              title: "Plano 1",
              order: 0,
              durationSeconds: 5,
              prompt: "",
              camera: null,
              transition: null,
              assetIds: [],
            },
          ],
        },
      ],
    });
  if (action.type === "update_scene")
    return dirty(state, {
      version: 1,
      scenes: state.document.scenes.map((scene) =>
        scene.id === action.sceneId
          ? { ...scene, [action.field]: action.value }
          : scene,
      ),
    });
  if (action.type === "remove_scene")
    return dirty(state, {
      version: 1,
      scenes: state.document.scenes.filter(
        (scene) => scene.id !== action.sceneId,
      ),
    });
  if (action.type === "move_scene") {
    const scenes = [...state.document.scenes];
    const index = scenes.findIndex((scene) => scene.id === action.sceneId);
    const target = index + action.direction;
    if (index < 0 || target < 0 || target >= scenes.length) return state;
    [scenes[index], scenes[target]] = [scenes[target], scenes[index]];
    return dirty(state, { version: 1, scenes });
  }
  if (action.type === "add_shot")
    return dirty(state, {
      version: 1,
      scenes: state.document.scenes.map((scene) =>
        scene.id === action.sceneId
          ? {
              ...scene,
              shots: [
                ...scene.shots,
                {
                  id: action.shotId,
                  title: `Plano ${scene.shots.length + 1}`,
                  order: scene.shots.length,
                  durationSeconds: 5,
                  prompt: "",
                  camera: null,
                  transition: null,
                  assetIds: [],
                },
              ],
            }
          : scene,
      ),
    });
  if (action.type === "duplicate_shot")
    return dirty(state, {
      version: 1,
      scenes: state.document.scenes.map((scene) => {
        if (scene.id !== action.sceneId) return scene;
        const source = scene.shots.find((shot) => shot.id === action.shotId);
        return source
          ? {
              ...scene,
              shots: [
                ...scene.shots,
                {
                  ...source,
                  id: action.newId,
                  title: `${source.title} — copia`,
                  order: scene.shots.length,
                },
              ],
            }
          : scene;
      }),
    });
  if (action.type === "update_shot")
    return dirty(state, {
      version: 1,
      scenes: state.document.scenes.map((scene) =>
        scene.id === action.sceneId
          ? {
              ...scene,
              shots: scene.shots.map((shot) =>
                shot.id === action.shotId
                  ? { ...shot, [action.field]: action.value }
                  : shot,
              ),
            }
          : scene,
      ),
    });
  if (action.type === "remove_shot")
    return dirty(state, {
      version: 1,
      scenes: state.document.scenes.map((scene) =>
        scene.id === action.sceneId
          ? {
              ...scene,
              shots: scene.shots.filter((shot) => shot.id !== action.shotId),
            }
          : scene,
      ),
    });
  if (action.type === "move_shot")
    return dirty(state, {
      version: 1,
      scenes: state.document.scenes.map((scene) => {
        if (scene.id !== action.sceneId) return scene;
        const shots = [...scene.shots];
        const index = shots.findIndex((shot) => shot.id === action.shotId);
        const target = index + action.direction;
        if (index < 0 || target < 0 || target >= shots.length) return scene;
        [shots[index], shots[target]] = [shots[target], shots[index]];
        return { ...scene, shots };
      }),
    });
  if (action.type === "save_start")
    return { ...state, saveState: "saving", message: null };
  if (action.type === "save_success")
    return {
      ...state,
      projectId: action.projectId,
      dirty: false,
      saveState: "saved",
      message: null,
    };
  if (action.type === "save_error")
    return { ...state, saveState: "error", message: action.message };
  return state;
}

const Context = createContext<{
  state: StoryProjectState;
  dispatch: React.Dispatch<StoryProjectAction>;
  assets: StoryAssetOption[];
} | null>(null);

export function StoryProjectProvider({
  project,
  template = "custom",
  kind = "story",
  initialView = "storyboard",
  assets,
  children,
}: {
  project?: CreativeProject | null;
  template?: StoryTemplate;
  kind?: CreativeProjectKind;
  initialView?: StoryEditorView;
  assets: StoryAssetOption[];
  children: React.ReactNode;
}) {
  const [state, dispatch] = useReducer(storyProjectReducer, {
    projectId: project?.id ?? null,
    kind: project?.kind ?? kind,
    title:
      project?.title ??
      (kind === "director" ? "Proyecto de director sin título" : "Historia sin título"),
    description: project?.description ?? "",
    storyType: project?.storyType ?? template,
    coverAssetId: project?.coverAssetId ?? null,
    document: project?.document ?? { version: 1, scenes: [] },
    view: initialView,
    saveState: "idle",
    message: null,
    dirty: false,
  });
  const value = useMemo(() => ({ state, dispatch, assets }), [assets, state]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useStoryProject() {
  const value = useContext(Context);
  if (!value)
    throw new Error(
      "useStoryProject debe usarse dentro de StoryProjectProvider",
    );
  return value;
}
