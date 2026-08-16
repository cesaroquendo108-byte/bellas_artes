export type MotionLevel = "none" | "subtle" | "expressive";

export type SurfaceState =
  | "idle"
  | "loading"
  | "ready"
  | "empty"
  | "error"
  | "disabled"
  | "preparing";

export type UiStatusTone =
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "info";

export type GenerationSurfaceStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "canceled"
  | "not_configured";

export type VisualDirection = "nocturno" | "cine-violeta" | "caribe-electrico" | "tierra-de-estudio";

export const surfaceStateLabels: Record<SurfaceState, string> = {
  idle: "Listo",
  loading: "Cargando",
  ready: "Listo para usar",
  empty: "Sin contenido",
  error: "Necesita atención",
  disabled: "Desactivado",
  preparing: "En preparación",
};

export const uiStatusToneClasses: Record<UiStatusTone, string> = {
  neutral: "border ba-status--neutral",
  success: "border ba-status--success",
  warning: "border ba-status--warning",
  danger: "border ba-status--danger",
  info: "border ba-status--info",
};

export const generationStatusLabels: Record<GenerationSurfaceStatus, string> = {
  queued: "En cola",
  processing: "Procesando",
  completed: "Completado",
  failed: "Falló",
  canceled: "Cancelado",
  not_configured: "En preparación",
};

export const generationStatusTones: Record<GenerationSurfaceStatus, UiStatusTone> = {
  queued: "info",
  processing: "info",
  completed: "success",
  failed: "danger",
  canceled: "warning",
  not_configured: "warning",
};

export const workspacePalette = {
  canvas: "#F7F4EC",
  surface: "#FFFDF8",
  surfaceStrong: "#FFFFFF",
  ink: "#241F2E",
  muted: "#6F6878",
  border: "#E6DED1",
  primary: "#7C3AED",
  primarySoft: "#F0E9FF",
  fuchsia: "#D946EF",
  cyan: "#0891B2",
} as const;

export const visualDirectionPalettes: Record<VisualDirection, {
  canvas: string;
  accent: string;
  accentSoft: string;
  contrast: string;
}> = {
  nocturno: { canvas: "#0A0A0A", accent: "#8B5CF6", accentSoft: "#2E1065", contrast: "#F5F3FF" },
  "cine-violeta": { canvas: "#120D1F", accent: "#C084FC", accentSoft: "#3B176B", contrast: "#FAF5FF" },
  "caribe-electrico": { canvas: "#071A22", accent: "#22D3EE", accentSoft: "#083344", contrast: "#ECFEFF" },
  "tierra-de-estudio": { canvas: "#251B17", accent: "#F59E0B", accentSoft: "#542B05", contrast: "#FFFBEB" },
};
