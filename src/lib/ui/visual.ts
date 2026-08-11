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
  neutral: "border-white/10 bg-white/[0.05] text-slate-300",
  success: "border-emerald-300/20 bg-emerald-300/10 text-emerald-200",
  warning: "border-amber-300/20 bg-amber-300/10 text-amber-200",
  danger: "border-rose-300/20 bg-rose-300/10 text-rose-200",
  info: "border-cyan-300/20 bg-cyan-300/10 text-cyan-200",
};

