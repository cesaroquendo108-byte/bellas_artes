"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
} from "react";

import type { VideoOperation } from "@/lib/generation/contracts";

import { VIDEO_TOOL_META } from "./config";
import type {
  LocalMedia,
  MediaSlot,
  StudioAsset,
  VideoStudioFields,
  VideoStudioState,
} from "./types";

type Action =
  | {
      type: "field";
      key: keyof VideoStudioFields;
      value: VideoStudioFields[keyof VideoStudioFields];
    }
  | { type: "local-media"; slot: MediaSlot; value?: LocalMedia }
  | { type: "saved-asset"; slot: MediaSlot; value?: StudioAsset }
  | { type: "feedback"; value: VideoStudioState["feedback"] }
  | { type: "submitting"; value: boolean };

interface VideoStudioContextValue {
  state: VideoStudioState;
  setField: <K extends keyof VideoStudioFields>(
    key: K,
    value: VideoStudioFields[K],
  ) => void;
  setLocalMedia: (
    slot: MediaSlot,
    file: File,
    type: LocalMedia["type"],
  ) => void;
  clearLocalMedia: (slot: MediaSlot) => void;
  selectSavedAsset: (slot: MediaSlot, asset?: StudioAsset) => void;
  setFeedback: (feedback: VideoStudioState["feedback"]) => void;
  setSubmitting: (submitting: boolean) => void;
}

const VideoStudioContext = createContext<VideoStudioContextValue | null>(null);

function createInitialState({ operation, initialPrompt }: { operation: VideoOperation; initialPrompt?: string }): VideoStudioState {
  return {
    operation,
    fields: {
      model: VIDEO_TOOL_META[operation].defaultModel,
      prompt: initialPrompt?.slice(0, 4_000) ?? "",
      negativePrompt: "",
      aspectRatio: "16:9",
      durationSeconds: 5,
      motionStrength: 6,
      fps: 24,
      seed: 0,
      randomSeed: true,
      cfgScale: 7,
      stylePreset: "cinematic",
      cameraMotion: "none",
      transformStrength: 0.65,
      effectTemplate: "portal",
      targetResolution: "4k",
      enhancement: 70,
      audioMode: "tts",
      syncIntensity: 85,
      faceRestore: true,
      extendMode: "time",
      extendDirection: "forward",
      extensionSeconds: 5,
      keepCameraMotion: true,
      syncAudio: true,
      maskMode: "auto",
      brushSize: 28,
      characterMode: "reference",
    },
    localMedia: {},
    savedAssets: {},
    feedback: null,
    submitting: false,
  };
}

function reducer(state: VideoStudioState, action: Action): VideoStudioState {
  switch (action.type) {
    case "field":
      return {
        ...state,
        fields: { ...state.fields, [action.key]: action.value },
      };
    case "local-media":
      return {
        ...state,
        localMedia: { ...state.localMedia, [action.slot]: action.value },
      };
    case "saved-asset":
      return {
        ...state,
        savedAssets: { ...state.savedAssets, [action.slot]: action.value },
      };
    case "feedback":
      return { ...state, feedback: action.value };
    case "submitting":
      return { ...state, submitting: action.value };
  }
}

export function VideoStudioProvider({
  operation,
  initialPrompt,
  children,
}: {
  operation: VideoOperation;
  initialPrompt?: string;
  children: React.ReactNode;
}) {
  const [state, dispatch] = useReducer(reducer, { operation, initialPrompt }, createInitialState);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(
    () => () => {
      Object.values(stateRef.current.localMedia).forEach((media) => {
        if (media) URL.revokeObjectURL(media.previewUrl);
      });
    },
    [],
  );

  useEffect(() => {
    const stored = sessionStorage.getItem("bellas-artes-remix");
    if (!stored) return;
    let active = true;

    try {
      const remix = JSON.parse(stored) as { prompt?: unknown };
      if (typeof remix.prompt === "string" && remix.prompt.trim()) {
        queueMicrotask(() => {
          if (!active) return;
          dispatch({
            type: "field",
            key: "prompt",
            value: remix.prompt as string,
          });
          dispatch({
            type: "feedback",
            value: {
              tone: "info",
              message:
                "Se cargó el contexto público. El asset del autor no se copió ni se expuso; selecciona uno propio si esta herramienta lo requiere.",
            },
          });
        });
      }
    } catch {
      // Ignore malformed browser-only handoff data.
    } finally {
      sessionStorage.removeItem("bellas-artes-remix");
    }

    return () => {
      active = false;
    };
  }, []);

  const setField = useCallback(
    <K extends keyof VideoStudioFields>(
      key: K,
      value: VideoStudioFields[K],
    ) => {
      dispatch({ type: "field", key, value });
    },
    [],
  );

  const clearLocalMedia = useCallback((slot: MediaSlot) => {
    const current = stateRef.current.localMedia[slot];
    if (current) URL.revokeObjectURL(current.previewUrl);
    dispatch({ type: "local-media", slot });
  }, []);

  const setLocalMedia = useCallback(
    (slot: MediaSlot, file: File, type: LocalMedia["type"]) => {
      const current = stateRef.current.localMedia[slot];
      if (current) URL.revokeObjectURL(current.previewUrl);
      dispatch({ type: "saved-asset", slot });
      dispatch({
        type: "local-media",
        slot,
        value: { file, type, previewUrl: URL.createObjectURL(file) },
      });
    },
    [],
  );

  const selectSavedAsset = useCallback(
    (slot: MediaSlot, asset?: StudioAsset) => {
      const current = stateRef.current.localMedia[slot];
      if (current) URL.revokeObjectURL(current.previewUrl);
      dispatch({ type: "local-media", slot });
      dispatch({ type: "saved-asset", slot, value: asset });
    },
    [],
  );

  return (
    <VideoStudioContext.Provider
      value={{
        state,
        setField,
        setLocalMedia,
        clearLocalMedia,
        selectSavedAsset,
        setFeedback: (value) => dispatch({ type: "feedback", value }),
        setSubmitting: (value) => dispatch({ type: "submitting", value }),
      }}
    >
      {children}
    </VideoStudioContext.Provider>
  );
}

export function useVideoStudio() {
  const context = useContext(VideoStudioContext);
  if (!context)
    throw new Error(
      "useVideoStudio debe utilizarse dentro de VideoStudioProvider",
    );
  return context;
}
