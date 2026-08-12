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
