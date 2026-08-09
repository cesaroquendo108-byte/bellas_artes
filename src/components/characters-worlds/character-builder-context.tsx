"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
} from "react";

import type { CharacterGenerationRequest } from "@/lib/generation/character-world";

import type { CharacterWorldAsset } from "./types";

export interface CharacterBuilderState {
  mode: CharacterGenerationRequest["mode"];
  name: string;
  triggerWord: string;
  lore: string;
  prompt: string;
  negativePrompt: string;
  model: CharacterGenerationRequest["model"];
  aspectRatio: CharacterGenerationRequest["aspectRatio"];
  cfgScale: number;
  steps: number;
  seed: number;
  randomSeed: boolean;
  faceLock: boolean;
  faceWeight: number;
  structured: NonNullable<CharacterGenerationRequest["structured"]>;
  loras: string[];
  localReference?: { file: File; previewUrl: string };
  savedReference?: CharacterWorldAsset;
  submitting: boolean;
  feedback: { tone: "error" | "info"; message: string } | null;
}

type FieldValue = CharacterBuilderState[keyof CharacterBuilderState];
type Action =
  | { type: "field"; key: keyof CharacterBuilderState; value: FieldValue }
  | { type: "local"; value?: CharacterBuilderState["localReference"] }
  | { type: "saved"; value?: CharacterWorldAsset };

const initialState: CharacterBuilderState = {
  mode: "prompt",
  name: "Nuevo personaje",
  triggerWord: "@nuevo_personaje",
  lore: "",
  prompt: "",
  negativePrompt: "baja calidad, desenfoque, manos deformes",
  model: "flux-1-dev",
  aspectRatio: "4:5",
  cfgScale: 7,
  steps: 28,
  seed: 0,
  randomSeed: true,
  faceLock: true,
  faceWeight: 0.8,
  structured: {
    gender: "female",
    ethnicity: "latina",
    ageRange: "adult",
    bodyType: "athletic",
    aesthetic: "cinematic",
    expression: "confident",
    pose: "three-quarter",
  },
  loras: ["Cinematic Portrait"],
  submitting: false,
  feedback: null,
};

function reducer(
  state: CharacterBuilderState,
  action: Action,
): CharacterBuilderState {
  if (action.type === "field") return { ...state, [action.key]: action.value };
  if (action.type === "local")
    return { ...state, localReference: action.value };
  return { ...state, savedReference: action.value };
}

interface ContextValue {
  state: CharacterBuilderState;
  setField: <K extends keyof CharacterBuilderState>(
    key: K,
    value: CharacterBuilderState[K],
  ) => void;
  setLocalReference: (file?: File) => void;
  setSavedReference: (asset?: CharacterWorldAsset) => void;
}

const Context = createContext<ContextValue | null>(null);

export function CharacterBuilderProvider({
  children,
  initialReference,
}: {
  children: React.ReactNode;
  initialReference?: CharacterWorldAsset;
}) {
  const [state, dispatch] = useReducer(reducer, {
    ...initialState,
    savedReference: initialReference,
  });
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  useEffect(
    () => () => {
      if (stateRef.current.localReference)
        URL.revokeObjectURL(stateRef.current.localReference.previewUrl);
    },
    [],
  );

  const setLocalReference = useCallback((file?: File) => {
    const current = stateRef.current.localReference;
    if (current) URL.revokeObjectURL(current.previewUrl);
    dispatch({ type: "saved" });
    dispatch({
      type: "local",
      value: file ? { file, previewUrl: URL.createObjectURL(file) } : undefined,
    });
  }, []);
  const setSavedReference = useCallback((asset?: CharacterWorldAsset) => {
    const current = stateRef.current.localReference;
    if (current) URL.revokeObjectURL(current.previewUrl);
    dispatch({ type: "local" });
    dispatch({ type: "saved", value: asset });
  }, []);

  return (
    <Context.Provider
      value={{
        state,
        setField: (key, value) => dispatch({ type: "field", key, value }),
        setLocalReference,
        setSavedReference,
      }}
    >
      {children}
    </Context.Provider>
  );
}

export function useCharacterBuilder() {
  const value = useContext(Context);
  if (!value)
    throw new Error("useCharacterBuilder requiere CharacterBuilderProvider");
  return value;
}
