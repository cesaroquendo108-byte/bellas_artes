export type FreefieldSection = "image" | "video" | "audio" | "utility";

export type FreefieldInputType =
  | "text"
  | "textarea"
  | "number"
  | "slider"
  | "select"
  | "toggle"
  | "seed"
  | "image"
  | "video"
  | "audio";

export interface FreefieldBind {
  node: string;
  field: string;
  template?: string;
}

export interface FreefieldOption {
  value: unknown;
  label: string;
  sets?: Array<{ node: string; field: string; value: unknown }>;
}

export interface FreefieldInput {
  id: string;
  type: FreefieldInputType;
  label: string;
  help?: string;
  default?: unknown;
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
  options?: FreefieldOption[];
  gallery?: boolean;
  multiple?: { max?: number; join?: string; prefix?: string; suffix?: string; ordered?: boolean };
  paint?: string;
  limits?: { max_mb?: number; seconds?: [number, number] };
  bind?: FreefieldBind[];
}

export interface FreefieldOutput {
  node: string;
  type: "image" | "video" | "audio";
  label?: string;
}

export interface FreefieldModel {
  repo: string;
  file: string;
  dir: string;
  gb: number;
  phase: "encode" | "denoise" | "denoise2" | "decode" | "aux" | "all";
  gated?: boolean;
  license?: string;
  optional?: boolean;
}

export interface FreefieldAppManifest {
  id: string;
  name: string;
  section: FreefieldSection;
  summary?: string;
  higgsfield_feature?: string;
  modes?: string[];
  mode_label?: string;
  pack: string;
  status: "draft" | "ready";
  workflow?: string;
  inputs: FreefieldInput[];
  outputs: FreefieldOutput[];
  models: FreefieldModel[];
  credits?: string[];
  vram?: { peak_gb?: number | null; measured_on?: string | null };
  test?: Record<string, unknown>;
  notes?: string;
}

export interface FreefieldApiNode {
  class_type: string;
  inputs: Record<string, unknown>;
  _meta?: { title?: string };
}

export type FreefieldWorkflowGraph = Record<string, FreefieldApiNode>;

export interface FreefieldApp extends FreefieldAppManifest {
  dir: string;
  graph?: FreefieldWorkflowGraph;
}
