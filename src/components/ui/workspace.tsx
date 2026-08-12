import type { ReactNode } from "react";
import { AlertTriangle, ArrowRight, LoaderCircle, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="max-w-2xl">
        {eyebrow ? <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-700">{eyebrow}</p> : null}
        <h2 className="mt-1 text-xl font-semibold tracking-[-0.025em] text-[#241f2e] sm:text-2xl">{title}</h2>
        {description ? <p className="mt-2 text-sm leading-6 text-[#756d7c]">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function LoadingState({ label = "Preparando tu estudio…", className }: { label?: string; className?: string }) {
  return (
    <div role="status" className={cn("workspace-surface flex min-h-48 flex-col items-center justify-center rounded-3xl p-8 text-center", className)}>
      <LoaderCircle className="size-6 animate-spin text-violet-600 motion-reduce:animate-none" />
      <p className="mt-4 text-sm font-medium text-[#3f3748]">{label}</p>
    </div>
  );
}

export function ErrorState({ title = "No pudimos cargar esta sección", description, action, className }: { title?: string; description: string; action?: ReactNode; className?: string }) {
  return (
    <div role="alert" className={cn("rounded-3xl border border-rose-200 bg-rose-50 p-6 text-center", className)}>
      <AlertTriangle className="mx-auto size-6 text-rose-600" />
      <h3 className="mt-3 text-sm font-semibold text-rose-950">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-rose-700">{description}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function ProgressBar({ value, label, className }: { value: number; label?: string; className?: string }) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className={className}>
      {label ? <div className="mb-2 flex items-center justify-between text-xs text-[#756d7c]"><span>{label}</span><span className="font-semibold text-[#3f3748]">{clamped}%</span></div> : null}
      <div className="h-2 overflow-hidden rounded-full bg-[#e9e2d7]" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={clamped} aria-label={label ?? "Progreso"}>
        <div className="h-full rounded-full bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-500 transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
}

export function StudioShell({ sidebar, children, header, className }: { sidebar?: ReactNode; children: ReactNode; header?: ReactNode; className?: string }) {
  return (
    <section className={cn("workspace-surface overflow-hidden rounded-[26px]", className)}>
      {header ? <div className="border-b border-[#e6ded1] bg-white/80 px-4 py-3 sm:px-5">{header}</div> : null}
      <div className={cn("min-h-[32rem]", sidebar ? "lg:grid lg:grid-cols-[22rem_minmax(0,1fr)]" : "") }>
        {sidebar ? <aside className="border-b border-[#e6ded1] bg-[#fffdf8] lg:border-b-0 lg:border-r">{sidebar}</aside> : null}
        <div className="min-w-0">{children}</div>
      </div>
    </section>
  );
}

export function MediaCard({ preview, title, description, meta, action, className }: { preview: ReactNode; title: string; description?: string; meta?: string; action?: ReactNode; className?: string }) {
  return (
    <article className={cn("group overflow-hidden rounded-2xl border border-[#e6ded1] bg-white shadow-[0_10px_26px_rgba(66,51,81,.05)] transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-[0_16px_34px_rgba(76,29,149,.09)] motion-reduce:transform-none", className)}>
      <div className="aspect-[4/3] overflow-hidden bg-[#eee9df]">{preview}</div>
      <div className="p-4">
        {meta ? <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-700">{meta}</p> : null}
        <h3 className="mt-1 truncate text-sm font-semibold text-[#241f2e]">{title}</h3>
        {description ? <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#756d7c]">{description}</p> : null}
        {action ? <div className="mt-4">{action}</div> : null}
      </div>
    </article>
  );
}

export function ResponsiveTable({ children, label, className }: { children: ReactNode; label: string; className?: string }) {
  return <div className={cn("workspace-surface max-w-full overflow-x-auto rounded-2xl", className)} role="region" aria-label={label} tabIndex={0}>{children}</div>;
}

export function PreparingCallout({ title, description, href, linkLabel = "Ver detalles" }: { title: string; description: string; href?: string; linkLabel?: string }) {
  const content = (
    <>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><Sparkles className="size-4" /></span>
      <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-[#241f2e]">{title}</span><span className="mt-1 block text-xs leading-5 text-[#756d7c]">{description}</span></span>
      {href ? <ArrowRight className="size-4 shrink-0 text-violet-600" /> : null}
    </>
  );
  return href ? <a href={href} className="workspace-surface flex items-center gap-3 rounded-2xl p-4 transition hover:border-violet-200" aria-label={linkLabel}>{content}</a> : <div className="workspace-surface flex items-center gap-3 rounded-2xl p-4">{content}</div>;
}
