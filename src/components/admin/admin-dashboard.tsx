"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  Ban,
  CheckCircle2,
  Coins,
  CreditCard,
  Database,
  Gauge,
  HardDrive,
  RefreshCw,
  ServerCog,
  ShieldAlert,
  Sparkles,
  UsersRound,
  WalletCards,
  Workflow,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AnimatedMetric, StatusPill } from "@/components/ui/motion-effects";
import {
  adminDashboardWindows,
  type AdminDashboardSnapshot,
  type AdminDashboardWindow,
  type ServiceHealthState,
} from "@/lib/admin/contracts";
import { formatAdminDateTime, formatRelativeAt } from "@/lib/admin/format";
import { cn } from "@/lib/utils";

const windowLabels: Record<AdminDashboardWindow, string> = { "24h": "24H", "7d": "7D", "30d": "30D" };
const serviceTone: Record<ServiceHealthState, "success" | "warning" | "danger" | "neutral"> = {
  healthy: "success",
  degraded: "warning",
  stale: "warning",
  stopped: "neutral",
  not_configured: "neutral",
  error: "danger",
};
const serviceLabels: Record<ServiceHealthState, string> = {
  healthy: "Operativo",
  degraded: "Degradado",
  stale: "Sin heartbeat",
  stopped: "Detenido",
  not_configured: "Sin configurar",
  error: "Error",
};

export function AdminDashboard({ initialSnapshot }: { initialSnapshot: AdminDashboardSnapshot }) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [selectedWindow, setSelectedWindow] = useState(initialSnapshot.window);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pauseOpen, setPauseOpen] = useState(false);
  const [pauseReason, setPauseReason] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [pausing, setPausing] = useState(false);

  const refresh = useCallback(async (window = selectedWindow, quiet = false) => {
    if (!quiet) setRefreshing(true);
    try {
      const response = await fetch(`/api/admin/overview?window=${window}`, { cache: "no-store" });
      const payload = await response.json() as AdminDashboardSnapshot & { message?: string };
      if (!response.ok) throw new Error(payload.message ?? "No se pudo actualizar el Dashboard.");
      setSnapshot(payload);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo actualizar el Dashboard.");
    } finally {
      if (!quiet) setRefreshing(false);
    }
  }, [selectedWindow]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh(selectedWindow, true);
    }, 30_000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") void refresh(selectedWindow, true);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refresh, selectedWindow]);

  const selectWindow = (window: AdminDashboardWindow) => {
    setSelectedWindow(window);
    void refresh(window);
  };

  const pauseGeneration = async () => {
    setPausing(true);
    try {
      const response = await fetch("/api/admin/runtime/generation/pause", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason: pauseReason, confirmation }),
      });
      const payload = await response.json() as { message?: string };
      if (!response.ok) throw new Error(payload.message ?? "No se pudo aplicar la pausa.");
      setPauseOpen(false);
      setPauseReason("");
      setConfirmation("");
      await refresh(selectedWindow);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo aplicar la pausa.");
    } finally {
      setPausing(false);
    }
  };

  const metricCards = useMemo(() => [
    { label: "Usuarios", value: snapshot.metrics.usersTotal, detail: `+${snapshot.metrics.usersNew} en el período`, icon: UsersRound, color: "text-sky-300" },
    { label: "Beta habilitada", value: snapshot.metrics.betaUsers, detail: "Grants activos", icon: Sparkles, color: "text-violet-300" },
    { label: "Jobs", value: snapshot.metrics.jobsTotal, detail: `${snapshot.metrics.jobsCompleted} completados`, icon: Workflow, color: "text-cyan-300" },
    { label: "Éxito", value: snapshot.metrics.successRate, suffix: "%", detail: `${snapshot.metrics.jobsFailed} fallidos · ${snapshot.metrics.jobsCanceled} cancelados`, icon: CheckCircle2, color: "text-emerald-300" },
    { label: "Gasto GPU real", value: snapshot.costs.actualUsd, prefix: "$", detail: `Estimado separado: $${formatUsd(snapshot.costs.estimatedUsd)}`, icon: Coins, color: "text-amber-300", decimals: true },
    { label: "Intervenciones", value: snapshot.interventions.total, detail: "Requieren revisión", icon: ShieldAlert, color: snapshot.interventions.total ? "text-red-300" : "text-emerald-300" },
  ], [snapshot]);

  return (
    <div className="min-w-0 space-y-6 text-white">
      <section className="relative overflow-hidden rounded-[28px] border border-amber-300/10 bg-gradient-to-br from-amber-400/[0.08] via-[#111113] to-violet-500/[0.06] p-5 sm:p-7">
        <div className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-amber-300/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.18em] text-amber-300">Administración</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">Centro de operaciones</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Usuarios, pagos, colas, infraestructura y gasto de generación en una sola vista.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-white/10 bg-black/20 p-1">
              {adminDashboardWindows.map((window) => <button key={window} type="button" onClick={() => selectWindow(window)} className={cn("rounded-md px-3 py-1.5 text-xs font-medium transition", selectedWindow === window ? "bg-amber-400/15 text-amber-200" : "text-slate-500 hover:text-white")}>{windowLabels[window]}</button>)}
            </div>
            <Button variant="outline" onClick={() => void refresh()} disabled={refreshing}><RefreshCw className={cn(refreshing && "animate-spin")} />Actualizar</Button>
          </div>
        </div>
        <div className="relative mt-6 flex flex-wrap items-center gap-2">
          <StatusPill state={snapshot.runtime.effectiveEnabled ? "Generación activa" : snapshot.runtime.emergencyPaused ? "Pausa de emergencia" : "Generación deshabilitada"} tone={snapshot.runtime.effectiveEnabled ? "success" : snapshot.runtime.emergencyPaused ? "danger" : "warning"} />
          <StatusPill state={`Acceso ${snapshot.runtime.accessMode}`} tone="info" />
          <StatusPill state={`Billing ${snapshot.runtime.billingMode}`} tone="neutral" />
          <StatusPill state={`Proveedor ${snapshot.runtime.provider ?? "sin configurar"}`} tone="neutral" />
          <span className="text-xs text-slate-600">Actualizado {formatRelativeAt(snapshot.generatedAt, snapshot.generatedAt)}</span>
          {!snapshot.runtime.emergencyPaused && (
            <Dialog open={pauseOpen} onOpenChange={setPauseOpen}>
              <DialogTrigger className="ml-auto inline-flex h-8 items-center gap-2 rounded-lg border border-red-400/20 bg-red-500/5 px-3 text-xs font-medium text-red-300 transition hover:bg-red-500/10"><Ban className="size-3.5" />Pausa de emergencia</DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Pausar nuevas generaciones</DialogTitle><DialogDescription>Detiene nuevas reservas y encolados. No cancela jobs que ya estén procesando y no apaga servicios externos.</DialogDescription></DialogHeader>
                <div className="mt-5 space-y-4"><label className="block text-xs text-slate-400">Motivo operativo<Textarea value={pauseReason} onChange={(event) => setPauseReason(event.target.value)} placeholder="Describe el incidente o la razón de la pausa" className="mt-2" /></label><label className="block text-xs text-slate-400">Escribe PAUSAR GENERACION<Input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="mt-2 font-mono" /></label></div>
                <DialogFooter><Button variant="outline" onClick={() => setPauseOpen(false)}>Cancelar</Button><Button variant="destructive" onClick={() => void pauseGeneration()} disabled={pausing || pauseReason.trim().length < 8 || confirmation !== "PAUSAR GENERACION"}>{pausing ? "Pausando…" : "Confirmar pausa"}</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
        {snapshot.runtime.emergencyPaused && <div className="relative mt-4 rounded-xl border border-red-400/20 bg-red-500/[0.07] p-4 text-xs text-red-200"><strong>Pausa activa.</strong> {snapshot.runtime.pauseReason || "Sin motivo registrado."}{snapshot.runtime.pausedAt ? ` · ${formatAdminDateTime(snapshot.runtime.pausedAt)}` : ""}</div>}
      </section>

      {error && <div role="alert" className="rounded-xl border border-red-400/20 bg-red-500/[0.07] p-4 text-sm text-red-200">{error}</div>}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {metricCards.map(({ label, value, detail, icon: Icon, color, prefix, suffix, decimals }) => <article key={label} className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4"><div className="flex items-center justify-between"><p className="text-xs text-slate-500">{label}</p><Icon className={cn("size-4", color)} /></div><p className="mt-3 text-2xl font-semibold tracking-tight">{prefix}<AnimatedMetric value={decimals ? Math.round(value * 10_000) / 10_000 : value} />{suffix}</p><p className="mt-2 text-[11px] leading-4 text-slate-600">{detail}</p></article>)}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
        <Panel title="Salud de servicios" icon={Activity} description="Estado observado sin exponer configuración sensible.">
          <div className="grid gap-3 sm:grid-cols-2">
            {snapshot.services.map((service) => <div key={service.key} className="rounded-xl border border-white/[0.07] bg-black/20 p-4"><div className="flex items-center justify-between gap-3"><p className="text-sm font-medium">{service.label}</p><StatusPill state={serviceLabels[service.state]} tone={serviceTone[service.state]} /></div><p className="mt-2 text-xs leading-5 text-slate-500">{service.summary}</p>{service.observedAt && <p className="mt-2 text-[10px] text-slate-700">{formatRelativeAt(service.observedAt, snapshot.generatedAt)}</p>}</div>)}
          </div>
        </Panel>
        <Panel title="Intervenciones" icon={AlertTriangle} description="Elementos que requieren revisión humana u operativa.">
          <div className="space-y-2">
            <Intervention href="/admin/payments" label="Comprobantes" value={snapshot.interventions.payments} icon={CreditCard} />
            <Intervention label="Jobs fallidos" value={snapshot.interventions.failedJobs} icon={Workflow} />
            <Intervention label="Dead-letter queue" value={snapshot.interventions.dlq} icon={Database} />
            <Intervention label="Descuadres de reembolso" value={snapshot.interventions.refundMismatches} icon={WalletCards} />
            <Intervention href="/admin/community" label="Moderación" value={snapshot.interventions.moderation} icon={ShieldAlert} />
            <Intervention label="Assets vencidos" value={snapshot.interventions.expiredAssets} icon={HardDrive} />
          </div>
        </Panel>
      </div>

      <Panel title="Colas por modalidad" icon={ServerCog} description="Conteos persistidos y heartbeats del worker. Los workflows no operativos se muestran explícitamente.">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {snapshot.queues.map((queue) => <article key={queue.kind} className="rounded-xl border border-white/[0.07] bg-black/20 p-4"><div className="flex items-center justify-between"><p className="text-sm font-semibold capitalize">{queue.kind}</p><span className={cn("size-2 rounded-full", queue.workerAvailable ? "bg-emerald-300" : "bg-slate-700")} /></div><div className="mt-4 grid grid-cols-2 gap-2 text-xs"><QueueCount label="En cola" value={queue.queued} /><QueueCount label="Procesando" value={queue.processing} /><QueueCount label="Fallidos" value={queue.failed} /><QueueCount label="DLQ" value={queue.dlq} /></div><div className="mt-4 border-t border-white/[0.06] pt-3"><StatusPill state={queue.workflowConfigured ? "Workflow real" : "Contrato solamente"} tone={queue.workflowConfigured ? "success" : "warning"} /></div>{queue.oldestQueuedAt && <p className="mt-2 text-[10px] text-slate-600">Más antiguo: {formatRelativeAt(queue.oldestQueuedAt, snapshot.generatedAt)}</p>}</article>)}
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_.7fr]">
        <Panel title="Jobs recientes" icon={Workflow} description="No se envían prompts ni payloads completos al navegador.">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-xs"><thead className="border-b border-white/[0.08] text-slate-500"><tr><th className="px-3 py-3 font-medium">Job</th><th className="px-3 py-3 font-medium">Usuario</th><th className="px-3 py-3 font-medium">Workflow</th><th className="px-3 py-3 font-medium">Estado</th><th className="px-3 py-3 font-medium">Tiempo</th><th className="px-3 py-3 text-right font-medium">Costo</th></tr></thead><tbody className="divide-y divide-white/[0.05]">{snapshot.recentJobs.map((job) => <tr key={job.id}><td className="px-3 py-3 font-mono text-slate-300">{job.id.slice(0, 8)}</td><td className="px-3 py-3 text-slate-400">{job.userLabel}</td><td className="max-w-64 truncate px-3 py-3 text-slate-400">{job.workflowVersion}</td><td className="px-3 py-3"><StatusPill state={job.status} tone={jobTone(job.status)} /></td><td className="px-3 py-3 text-slate-500">{formatDuration(job.durationMs)}</td><td className="px-3 py-3 text-right text-slate-300">{job.actualCostUsd !== null ? `$${formatUsd(job.actualCostUsd)}` : job.estimatedCostUsd !== null ? `~$${formatUsd(job.estimatedCostUsd)}` : "—"}</td></tr>)}{!snapshot.recentJobs.length && <tr><td colSpan={6} className="px-3 py-10 text-center text-slate-600">No hay jobs registrados.</td></tr>}</tbody></table>
          </div>
        </Panel>
        <Panel title="Costos y créditos" icon={Coins} description="Coste real y estimado permanecen separados.">
          <div className="space-y-3"><CostRow label="Costo Vast real" value={`$${formatUsd(snapshot.costs.actualUsd)}`} emphasized /><CostRow label="Costo estimado" value={`$${formatUsd(snapshot.costs.estimatedUsd)}`} /><CostRow label="Promedio real/output" value={`$${formatUsd(snapshot.costs.averageActualUsdPerCompletedOutput)}`} /><div className="my-4 h-px bg-white/[0.06]" /><CostRow label="Créditos cotizados" value={snapshot.costs.quotedCredits.toLocaleString("es-VE")} /><CostRow label="Créditos capturados" value={snapshot.costs.capturedCredits.toLocaleString("es-VE")} /><CostRow label="Créditos reembolsados" value={snapshot.costs.refundedCredits.toLocaleString("es-VE")} /></div>
          {snapshot.runtime.billingMode === "shadow" && <p className="mt-5 rounded-xl border border-violet-400/15 bg-violet-500/[0.06] p-3 text-xs leading-5 text-violet-200">Billing shadow: se cotiza y mide, pero no se cobra públicamente.</p>}
        </Panel>
      </div>
    </div>
  );
}

function Panel({ title, description, icon: Icon, children }: { title: string; description: string; icon: typeof Gauge; children: React.ReactNode }) {
  return <section className="min-w-0 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 sm:p-5"><header className="mb-4 flex items-start gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-400/10 text-amber-300"><Icon className="size-4" /></span><div className="min-w-0"><h2 className="text-sm font-semibold">{title}</h2><p className="mt-1 text-xs leading-5 text-slate-600">{description}</p></div></header>{children}</section>;
}

function Intervention({ href, label, value, icon: Icon }: { href?: string; label: string; value: number; icon: typeof Gauge }) {
  const content = <><span className="flex items-center gap-2 text-sm text-slate-400"><Icon className="size-4 text-slate-600" />{label}</span><span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", value ? "bg-amber-400/10 text-amber-300" : "bg-emerald-400/10 text-emerald-300")}>{value}</span></>;
  return href ? <Link href={href} className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-black/20 p-3 transition hover:border-amber-300/15 hover:bg-white/[0.03]">{content}</Link> : <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-black/20 p-3">{content}</div>;
}

function QueueCount({ label, value }: { label: string; value: number }) { return <div className="rounded-lg bg-white/[0.03] p-2"><p className="text-slate-600">{label}</p><p className="mt-1 text-base font-semibold text-slate-300">{value}</p></div>; }
function CostRow({ label, value, emphasized }: { label: string; value: string; emphasized?: boolean }) { return <div className="flex items-center justify-between gap-4 text-sm"><span className="text-slate-500">{label}</span><span className={cn("font-medium tabular-nums", emphasized ? "text-emerald-300" : "text-slate-200")}>{value}</span></div>; }

function jobTone(status: string): "success" | "warning" | "danger" | "neutral" | "info" { return status === "completed" ? "success" : status === "failed" ? "danger" : status === "processing" ? "info" : status === "queued" ? "warning" : "neutral"; }
function formatUsd(value: number) { return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6 }); }
function formatDuration(value: number | null) { if (value === null) return "—"; if (value < 1_000) return `${value} ms`; const seconds = value / 1_000; return seconds < 60 ? `${seconds.toFixed(1)} s` : `${(seconds / 60).toFixed(1)} min`; }
