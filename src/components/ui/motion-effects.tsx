"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import NumberFlow from "@number-flow/react";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  RotateCcw,
  ShieldCheck,
  TerminalSquare,
  XCircle,
} from "lucide-react";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";
import {
  surfaceStateLabels,
  generationStatusLabels,
  generationStatusTones,
  uiStatusToneClasses,
  type GenerationSurfaceStatus,
  type MotionLevel,
  type SurfaceState,
  type UiStatusTone,
} from "@/lib/ui/visual";

const motionY: Record<Exclude<MotionLevel, "none">, number> = {
  subtle: 10,
  expressive: 18,
};

export function MotionReveal({
  children,
  className,
  delay = 0,
  level = "subtle",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  level?: MotionLevel;
}) {
  const reducedMotion = useReducedMotion();
  const animated = level !== "none" && !reducedMotion;

  return (
    <motion.div
      className={className}
      initial={animated ? { opacity: 0, y: motionY[level as Exclude<MotionLevel, "none">] } : false}
      whileInView={animated ? { opacity: 1, y: 0 } : undefined}
      viewport={{ once: true, amount: 0.18 }}
      transition={{ duration: level === "expressive" ? 0.7 : 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function SpotlightCard({
  children,
  className,
  contentClassName,
}: {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      className={cn("spotlight-card group relative overflow-hidden", className)}
      whileHover={reducedMotion ? undefined : { y: -3 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      onMouseMove={(event) => {
        if (reducedMotion) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        event.currentTarget.style.setProperty("--spotlight-x", `${event.clientX - bounds.left}px`);
        event.currentTarget.style.setProperty("--spotlight-y", `${event.clientY - bounds.top}px`);
      }}
    >
      <div className={cn("relative z-10 size-full", contentClassName)}>{children}</div>
    </motion.div>
  );
}

export function ShimmerButton({
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button className={cn("shimmer-button", className)} {...props}>
      <span className="relative z-10 inline-flex items-center justify-center gap-2">{children}</span>
    </button>
  );
}

export function ShimmerLink({
  children,
  className,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: ReactNode }) {
  return (
    <Link className={cn("shimmer-button", className)} {...props}>
      <span className="relative z-10 inline-flex items-center justify-center gap-2">{children}</span>
    </Link>
  );
}

export function AnimatedGradientText({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("animated-gradient-text", className)}>{children}</span>;
}

export function StatusPill({
  state,
  tone = "neutral",
  className,
}: {
  state: SurfaceState | string;
  tone?: UiStatusTone;
  className?: string;
}) {
  const label = state in surfaceStateLabels ? surfaceStateLabels[state as SurfaceState] : state;
  return <span className={cn("ba-status inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold", uiStatusToneClasses[tone], className)}>{label}</span>;
}

export function GenerationSkeleton({ className }: { className?: string }) {
  return <div className={cn("generation-skeleton", className)} aria-label="Cargando contenido" role="status" />;
}

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("ba-empty-state rounded-3xl border border-dashed p-8 text-center", className)}>
      <div className="ba-empty-state__icon mx-auto flex size-12 items-center justify-center rounded-2xl border" aria-hidden="true">✦</div>
      <h3 className="ba-empty-state__title mt-4 text-sm font-semibold">{title}</h3>
      <p className="ba-empty-state__description mx-auto mt-2 max-w-md text-xs leading-5">{description}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function AnimatedMetric({ value, className }: { value: number; className?: string }) {
  return <NumberFlow value={value} locales="es-VE" className={cn("tabular-nums", className)} />;
}

export function ProgressRing({ value, className }: { value: number; className?: string }) {
  const clampedValue = Math.min(100, Math.max(0, value));
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (clampedValue / 100) * circumference;

  return (
    <svg className={cn("size-12 -rotate-90", className)} viewBox="0 0 44 44" role="img" aria-label={`${clampedValue}% completado`}>
      <circle cx="22" cy="22" r={radius} fill="none" stroke="currentColor" strokeOpacity="0.1" strokeWidth="4" />
      <circle cx="22" cy="22" r={radius} fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="4" strokeDasharray={circumference} strokeDashoffset={dashOffset} className="text-violet-300 transition-[stroke-dashoffset] duration-500" />
    </svg>
  );
}

export interface GenerationStage {
  id: string;
  label: string;
  state: "pending" | "active" | "complete" | "error";
}

const generationStatusIcons: Record<GenerationSurfaceStatus, typeof Clock3> = {
  queued: Clock3,
  processing: LoaderCircle,
  completed: CheckCircle2,
  failed: AlertCircle,
  canceled: XCircle,
  not_configured: ShieldCheck,
};

export function ThinkingState({
  title = "Preparando el estudio",
  description = "Validamos la solicitud antes de reservar recursos.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-violet-300/15 bg-violet-500/[0.06] p-4" role="status" aria-live="polite">
      <LoaderCircle className="size-4 animate-spin text-violet-300 motion-reduce:animate-none" aria-hidden="true" />
      <div>
        <p className="text-sm font-medium text-white">{title}</p>
        <p className="mt-1 text-xs text-slate-400">{description}</p>
      </div>
    </div>
  );
}

export function JobProgressTimeline({ stages }: { stages: GenerationStage[] }) {
  return (
    <ol className="grid gap-2 sm:grid-cols-4" aria-label="Etapas de la generación">
      {stages.map((stage) => (
        <li key={stage.id} className={cn(
          "rounded-xl border px-3 py-2 text-xs",
          stage.state === "complete" && "border-emerald-300/20 bg-emerald-400/[0.06] text-emerald-200",
          stage.state === "active" && "border-violet-300/25 bg-violet-400/[0.08] text-violet-100",
          stage.state === "error" && "border-red-300/20 bg-red-400/[0.06] text-red-200",
          stage.state === "pending" && "border-white/[0.08] bg-white/[0.02] text-slate-500",
        )}>
          <span className="mr-2 inline-block size-1.5 rounded-full bg-current align-middle" aria-hidden="true" />
          {stage.label}
        </li>
      ))}
    </ol>
  );
}

export function GenerationStatusCard({
  status,
  title = "Estado de generación",
  description,
  progress,
  stages,
  onRetry,
  onCancel,
  className,
}: {
  status: GenerationSurfaceStatus;
  title?: string;
  description?: string;
  progress?: number;
  stages?: GenerationStage[];
  onRetry?: () => void;
  onCancel?: () => void;
  className?: string;
}) {
  const reducedMotion = useReducedMotion();
  const Icon = generationStatusIcons[status];
  const clampedProgress = progress === undefined ? undefined : Math.min(100, Math.max(0, progress));
  return (
    <motion.section
      className={cn("rounded-2xl border border-white/[0.09] bg-black/20 p-4", className)}
      initial={reducedMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24 }}
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <Icon className={cn("mt-0.5 size-4 text-violet-300", status === "processing" && !reducedMotion && "animate-spin")} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold text-white">{title}</h2>
            <StatusPill state={generationStatusLabels[status]} tone={generationStatusTones[status]} />
          </div>
          {description ? <p className="mt-1 text-xs leading-5 text-slate-400">{description}</p> : null}
        </div>
        {onRetry || onCancel ? (
          <div className="flex shrink-0 items-center gap-1">
            {onRetry ? <button type="button" onClick={onRetry} className="rounded-lg p-2 text-slate-400 transition hover:bg-white/[0.06] hover:text-white" aria-label="Reintentar"><RotateCcw className="size-4" /></button> : null}
            {onCancel ? <button type="button" onClick={onCancel} className="rounded-lg p-2 text-slate-400 transition hover:bg-white/[0.06] hover:text-white" aria-label="Cancelar"><XCircle className="size-4" /></button> : null}
          </div>
        ) : null}
      </div>
      {clampedProgress !== undefined ? (
        <div className="mt-4" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={clampedProgress}>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]"><motion.div className="h-full rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-400" initial={{ width: 0 }} animate={{ width: `${clampedProgress}%` }} transition={{ duration: reducedMotion ? 0 : 0.45 }} /></div>
        </div>
      ) : null}
      {stages?.length ? <div className="mt-4"><JobProgressTimeline stages={stages} /></div> : null}
    </motion.section>
  );
}

export function ToolCallCard({
  name,
  status,
  description,
  result,
}: {
  name: string;
  status: "ready" | "loading" | "error" | "preparing";
  description: string;
  result?: ReactNode;
}) {
  const statusMap = { ready: ["Listo", "success"], loading: ["Ejecutando", "info"], error: ["Falló", "danger"], preparing: ["En preparación", "warning"] } as const;
  const [label, tone] = statusMap[status];
  return (
    <article className="rounded-2xl border border-white/[0.09] bg-white/[0.025] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2"><TerminalSquare className="size-4 shrink-0 text-violet-300" /><code className="truncate text-xs text-white">{name}</code></div>
        <StatusPill state={label} tone={tone} />
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-400">{description}</p>
      {result ? <div className="mt-3 border-t border-white/[0.07] pt-3 text-xs text-slate-300">{result}</div> : null}
    </article>
  );
}

export function ApprovalCard({
  title,
  description,
  confirmLabel = "Confirmar",
  onConfirm,
  disabled = false,
}: {
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm?: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-amber-300/20 bg-amber-400/[0.06] p-4">
      <div className="flex gap-3"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-amber-200" /><div><h3 className="text-sm font-semibold text-amber-50">{title}</h3><p className="mt-1 text-xs leading-5 text-amber-100/70">{description}</p></div></div>
      {onConfirm ? <button type="button" disabled={disabled} onClick={onConfirm} className="mt-4 rounded-xl bg-amber-300 px-3 py-2 text-xs font-semibold text-amber-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50">{confirmLabel}</button> : null}
    </div>
  );
}

export function ArtifactResult({ title, description, children, action, className }: { title: string; description?: string; children?: ReactNode; action?: ReactNode; className?: string }) {
  return <section className={cn("rounded-2xl border border-emerald-300/15 bg-emerald-400/[0.05] p-4", className)}><div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-300" /><div className="min-w-0 flex-1"><h3 className="text-sm font-semibold text-emerald-50">{title}</h3>{description ? <p className="mt-1 text-xs leading-5 text-emerald-100/70">{description}</p> : null}{children ? <div className="mt-3">{children}</div> : null}{action ? <div className="mt-4">{action}</div> : null}</div></div></section>;
}

export function RetryState({ description, onRetry }: { description: string; onRetry: () => void }) {
  return <div className="rounded-2xl border border-red-300/15 bg-red-400/[0.05] p-4"><div className="flex gap-3"><AlertCircle className="mt-0.5 size-4 shrink-0 text-red-300" /><p className="text-xs leading-5 text-red-100/80">{description}</p></div><button type="button" onClick={onRetry} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-red-200/20 px-3 py-2 text-xs font-semibold text-red-100 transition hover:bg-red-200/10"><RotateCcw className="size-3.5" /> Reintentar</button></div>;
}

export function SpringTabs<T extends string>({ items, value, onChange, className }: { items: Array<{ value: T; label: string }>; value: T; onChange: (value: T) => void; className?: string }) {
  const reducedMotion = useReducedMotion();
  return <div className={cn("flex flex-wrap gap-1 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-1", className)} role="tablist">{items.map((item) => <button key={item.value} type="button" role="tab" aria-selected={value === item.value} onClick={() => onChange(item.value)} className="relative rounded-xl px-3 py-2 text-xs font-medium text-slate-400 transition hover:text-white data-[active=true]:text-white" data-active={value === item.value}>{value === item.value ? <motion.span layoutId="bellas-artes-spring-tab" className="absolute inset-0 -z-0 rounded-xl bg-violet-500/20" transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 28 }} /> : null}<span className="relative z-10">{item.label}</span></button>)}</div>;
}

export function ElasticMetric({ label, value, detail, className }: { label: string; value: number; detail?: string; className?: string }) {
  const reducedMotion = useReducedMotion();
  return <motion.div className={cn("rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4", className)} whileHover={reducedMotion ? undefined : { y: -2 }} transition={{ type: "spring", stiffness: 380, damping: 25 }}><p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold text-white"><AnimatedMetric value={value} /></p>{detail ? <p className="mt-1 text-xs text-slate-500">{detail}</p> : null}</motion.div>;
}

export function MotionToast({ children, tone = "info" }: { children: ReactNode; tone?: UiStatusTone }) {
  const reducedMotion = useReducedMotion();
  return <motion.div role={tone === "danger" ? "alert" : "status"} initial={reducedMotion ? false : { opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 30 }} className={cn("rounded-2xl px-4 py-3 text-xs", uiStatusToneClasses[tone], tone === "danger" ? "bg-red-400/[0.08] text-red-100" : "bg-white/[0.04] text-slate-200")}>{children}</motion.div>;
}
