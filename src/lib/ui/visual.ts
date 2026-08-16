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

export type VisualDirection = "farmacia-azul" | "cine-caribe" | "noche-navy" | "sol-editorial";

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
  canvas: "#F2F6FB",
  surface: "#FFFFFF",
  surfaceStrong: "#FFFFFF",
  ink: "#172740",
  muted: "#5D7088",
  border: "#DCE6F2",
  primary: "#0B72CE",
  primarySoft: "#E7F1FB",
  fuchsia: "#2F86D6",
  cyan: "#08768E",
} as const;

export const visualDirectionPalettes: Record<VisualDirection, {
  canvas: string;
  accent: string;
  accentSoft: string;
  contrast: string;
}> = {
  "farmacia-azul": { canvas: "#F2F6FB", accent: "#0B72CE", accentSoft: "#E7F1FB", contrast: "#172740" },
  "cine-caribe": { canvas: "#071A32", accent: "#2F86D6", accentSoft: "#123C69", contrast: "#F7FBFF" },
  "noche-navy": { canvas: "#0B213D", accent: "#6BB6F2", accentSoft: "#16305E", contrast: "#FFFFFF" },
  "sol-editorial": { canvas: "#FFF8DA", accent: "#FFD34D", accentSoft: "#FFF1A8", contrast: "#172740" },
};
