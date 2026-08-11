"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import NumberFlow from "@number-flow/react";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";
import {
  surfaceStateLabels,
  uiStatusToneClasses,
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
  return <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-medium", uiStatusToneClasses[tone], className)}>{label}</span>;
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
    <div className={cn("rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center", className)}>
      <div className="mx-auto flex size-12 items-center justify-center rounded-2xl border border-violet-300/15 bg-violet-300/10 text-violet-200" aria-hidden="true">✦</div>
      <h3 className="mt-4 text-sm font-semibold text-white">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-slate-500">{description}</p>
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

