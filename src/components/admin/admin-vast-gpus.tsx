"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Clock3,
  Copy,
  Cpu,
  ExternalLink,
  Gauge,
  HardDrive,
  Play,
  RefreshCw,
  Search,
  ServerCog,
  ShieldCheck,
  Square,
  Terminal,
  Trash2,
  WalletCards,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { AnimatedMetric, StatusPill } from "@/components/ui/motion-effects";
import {
  vastAdminTtlMinutes,
  type VastAdminMarket,
  type VastAdminOverview,
  type VastAdminPreset,
  type VastInstance,
  type VastInstanceAction,
  type VastOffer,
} from "@/lib/admin/vast-contracts";
import { cn } from "@/lib/utils";

type ActionTarget = { instance: VastInstance; action: VastInstanceAction };

export function AdminVastGpus({ initialOverview }: { initialOverview: VastAdminOverview }) {
  const [overview, setOverview] = useState(initialOverview);
  const [preset, setPreset] = useState<VastAdminPreset>(initialOverview.presets.find((item) => item.available)?.id ?? "comfy-clean");
  const [market, setMarket] = useState<VastAdminMarket>("on-demand");
  const [ttlMinutes, setTtlMinutes] = useState<15 | 30 | 60 | 120>(15);
  const [offers, setOffers] = useState<VastOffer[]>([]);
  const [selectedOffer, setSelectedOffer] = useState<VastOffer | null>(null);
  const [actionTarget, setActionTarget] = useState<ActionTarget | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const refresh = useCallback(async (quiet = false) => {
    if (!quiet) setBusy("refresh");
    try {
      const response = await fetch("/api/admin/vast/overview", { cache: "no-store" });
      const payload = await response.json() as VastAdminOverview & { message?: string };
      if (!response.ok) throw new Error(payload.message ?? "No se pudo actualizar Vast.ai.");
      setOverview(payload);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo actualizar Vast.ai.");
    } finally {
      if (!quiet) setBusy(null);
    }
  }, []);

  useEffect(() => {
    const refreshInterval = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh(true);
    }, 30_000);
    const clockInterval = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => {
      window.clearInterval(refreshInterval);
      window.clearInterval(clockInterval);
    };
  }, [refresh]);

  const searchOffers = async () => {
    setBusy("search");
    try {
      const response = await fetch("/api/admin/vast/offers/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ preset, market, ttlMinutes }),
      });
      const payload = await response.json() as { offers?: VastOffer[]; message?: string };
      if (!response.ok) throw new Error(payload.message ?? "No se pudieron buscar ofertas.");
      setOffers(payload.offers ?? []);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudieron buscar ofertas.");
      setOffers([]);
    } finally {
      setBusy(null);
    }
  };

  const rentSelectedOffer = async () => {
    if (!selectedOffer) return;
    setBusy(`rent:${selectedOffer.id}`);
    try {
      const response = await fetch("/api/admin/vast/leases", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          requestId: crypto.randomUUID(),
          offerId: selectedOffer.id,
          preset,
          market,
          ttlMinutes,
          confirmation,
        }),
      });
      const payload = await response.json() as { message?: string };
      if (!response.ok) throw new Error(payload.message ?? "No se pudo alquilar la GPU.");
      setSelectedOffer(null);
      setConfirmation("");
      setOffers([]);
      await refresh(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo alquilar la GPU.");
    } finally {
      setBusy(null);
    }
  };

  const runInstanceAction = async () => {
    if (!actionTarget) return;
    const { instance, action } = actionTarget;
    setBusy(`${action}:${instance.id}`);
    try {
      const response = await fetch(`/api/admin/vast/instances/${instance.id}/actions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, confirmation }),
      });
      const payload = await response.json() as { message?: string };
      if (!response.ok) throw new Error(payload.message ?? "No se pudo modificar la instancia.");
      setActionTarget(null);
      setConfirmation("");
      await refresh(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo modificar la instancia.");
    } finally {
      setBusy(null);
    }
  };

  const selectedPreset = overview.presets.find((item) => item.id === preset);
  const rentable = overview.enabled
    && overview.configured
    && overview.lifecycle.state === "healthy"
    && overview.activeAccountInstances < overview.limits.maxActiveInstances
    && Boolean(selectedPreset?.available);
  const balanceAvailable = Math.max((overview.balanceUsd ?? 0) - overview.limits.minBalanceReserveUsd, 0);
  const managedInstances = overview.instances.filter((instance) => instance.managed);
  const externalInstances = overview.instances.filter((instance) => !instance.managed);

  return (
    <div className="min-w-0 space-y-6 text-white">
      <section className="relative overflow-hidden rounded-[28px] border border-violet-300/15 bg-gradient-to-br from-violet-500/[0.12] via-[#111113] to-cyan-400/[0.06] p-5 sm:p-7">
        <div className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-violet-400/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.18em] text-violet-300">Vast.ai · cuenta administrativa</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">Alquiler de GPU</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Busca una máquina verificada, fija un TTL y pruébala desde cualquier lugar. Bellas Artes la destruye automáticamente al vencer.</p>
          </div>
          <Button variant="outline" onClick={() => void refresh()} disabled={busy === "refresh"}>
            <RefreshCw className={cn(busy === "refresh" && "animate-spin")} />Actualizar
          </Button>
        </div>
        <div className="relative mt-6 flex flex-wrap gap-2">
          <StatusPill state={overview.enabled ? "Alquiler habilitado" : "Alquiler deshabilitado"} tone={overview.enabled ? "success" : "warning"} />
          <StatusPill state={`Worker ${lifecycleLabel(overview.lifecycle.state)}`} tone={overview.lifecycle.state === "healthy" ? "success" : "warning"} />
          <StatusPill state={`${overview.activeAccountInstances}/${overview.limits.maxActiveInstances} GPU activa`} tone={overview.activeAccountInstances ? "warning" : "neutral"} />
          <span className="self-center text-xs text-slate-600">Actualizado {formatDateTime(overview.generatedAt)}</span>
        </div>
      </section>

      {error && <div role="alert" className="rounded-xl border border-red-400/20 bg-red-500/[0.07] p-4 text-sm text-red-200">{error}</div>}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Saldo real Vast" value={overview.balanceUsd} prefix="$" detail={overview.canPay ? "Cuenta habilitada para pagar" : "Pago no disponible"} icon={WalletCards} tone="text-emerald-300" />
        <Metric label="Reserva protegida" value={overview.limits.minBalanceReserveUsd} prefix="$" detail={`Disponible para alquilar: $${formatUsd(balanceAvailable)}`} icon={ShieldCheck} tone="text-violet-300" />
        <Metric label="Consumo actual" value={overview.currentHourlyUsd} prefix="$" suffix="/h" detail={`${overview.activeAccountInstances} instancias en la cuenta`} icon={Gauge} tone="text-amber-300" />
        <Metric label="Tope por alquiler" value={overview.limits.maxRentalUsd} prefix="$" detail={`Máximo $${formatUsd(overview.limits.maxHourlyUsd)}/h`} icon={Clock3} tone="text-cyan-300" />
      </section>

      <Panel title="Buscar una GPU" description="Los límites se vuelven a verificar en el servidor justo antes del alquiler." icon={Search}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1.4fr_1fr_1fr_auto] xl:items-end">
          <SelectField label="Preset" value={preset} onChange={(value) => { setPreset(value as VastAdminPreset); setOffers([]); }}>
            {overview.presets.map((item) => <option key={item.id} value={item.id} disabled={!item.available}>{item.name}{item.available ? "" : " · No disponible"}</option>)}
          </SelectField>
          <SelectField label="Mercado" value={market} onChange={(value) => { setMarket(value as VastAdminMarket); setOffers([]); }}>
            <option value="on-demand">On-demand</option><option value="bid">Bid · interrumpible</option>
          </SelectField>
          <SelectField label="Duración máxima" value={String(ttlMinutes)} onChange={(value) => { setTtlMinutes(Number(value) as 15 | 30 | 60 | 120); setOffers([]); }}>
            {vastAdminTtlMinutes.map((minutes) => <option key={minutes} value={minutes}>{minutes} minutos</option>)}
          </SelectField>
          <Button onClick={() => void searchOffers()} disabled={!rentable || busy === "search"}>
            <Search className={cn(busy === "search" && "animate-pulse")} />Buscar ofertas
          </Button>
        </div>
        {selectedPreset?.unavailableReason && <p className="mt-3 text-xs text-amber-300">{selectedPreset.unavailableReason}</p>}
        {!overview.enabled && <p className="mt-3 text-xs text-amber-300">El módulo está instalado en modo lectura. Debe habilitarse después de verificar el worker.</p>}
        {overview.lifecycle.state !== "healthy" && <p className="mt-3 text-xs text-red-300">No se alquilará ninguna GPU hasta recuperar el heartbeat de autodestrucción.</p>}

        <div className="mt-5 grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
          {offers.map((offer) => (
            <article key={offer.id} className="rounded-2xl border border-white/[0.08] bg-black/20 p-4">
              <div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-white">{offer.gpuName}</p><p className="mt-1 text-xs text-slate-500">{formatVram(offer.gpuRamMb)} · {offer.geolocation}</p></div><StatusPill state={`${(offer.reliability * 100).toFixed(1)}%`} tone="success" /></div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs"><Data label="Precio" value={`$${formatUsd(offer.hourlyUsd)}/h`} /><Data label="Tope TTL" value={`$${formatUsd(offer.projectedCostUsd)}`} /><Data label="Descarga" value={offer.inetDownMbps ? `${Math.round(offer.inetDownMbps)} Mbps` : "—"} /><Data label="Disco host" value={`${Math.round(offer.diskSpaceGb)} GB`} /></div>
              <Button className="mt-4 w-full" variant="outline" onClick={() => { setSelectedOffer(offer); setConfirmation(""); }}>Revisar y alquilar</Button>
            </article>
          ))}
          {busy !== "search" && offers.length === 0 && <div className="col-span-full rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-slate-600">Busca ofertas para comparar precios reales. La consulta no levanta una GPU.</div>}
        </div>
      </Panel>

      <Panel title="Instancias administradas" description="Detener una GPU no cancela el almacenamiento ni reinicia su TTL." icon={ServerCog}>
        <div className="space-y-3">
          {managedInstances.map((instance) => {
            const lease = overview.leases.find((item) => item.id === instance.leaseId);
            return <InstanceCard key={instance.id} instance={instance} leaseExpiresAt={lease?.expiresAt ?? null} now={now} onAction={(action) => { setActionTarget({ instance, action }); setConfirmation(""); }} />;
          })}
          {!managedInstances.length && <Empty text="No hay una GPU administrada activa." />}
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Historial de alquileres" description="Saldo posterior es una observación global de la cuenta, no una factura aislada." icon={HardDrive}>
          <div className="space-y-2">
            {overview.leases.map((lease) => <div key={lease.id} className="rounded-xl border border-white/[0.07] bg-black/20 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-sm font-medium">{lease.gpuName ?? lease.preset}</p><p className="mt-1 font-mono text-[10px] text-slate-600">{lease.id.slice(0, 12)}</p></div><StatusPill state={lease.state} tone={leaseTone(lease.state)} /></div><div className="mt-3 grid grid-cols-2 gap-2 text-xs"><Data label="Máximo" value={`$${formatUsd(lease.estimatedMaxCostUsd)}`} /><Data label="Precio" value={`$${formatUsd(lease.hourlyCostUsd)}/h`} /><Data label="Inicio" value={formatDateTime(lease.createdAt)} /><Data label="Final" value={lease.destroyedAt ? formatDateTime(lease.destroyedAt) : formatCountdown(lease.expiresAt, now)} /></div>{lease.errorMessage && <p className="mt-3 text-xs text-red-300">{lease.errorMessage}</p>}</div>)}
            {!overview.leases.length && <Empty text="Todavía no hay alquileres registrados." />}
          </div>
        </Panel>
        <Panel title="Otras instancias de la cuenta" description="Se muestran para evitar gasto duplicado, pero Bellas Artes no puede modificarlas." icon={Cpu}>
          <div className="space-y-2">{externalInstances.map((instance) => <div key={instance.id} className="rounded-xl border border-white/[0.07] bg-black/20 p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-medium">{instance.gpuName}</p><p className="mt-1 text-xs text-slate-600">#{instance.id} · {instance.label}</p></div><StatusPill state="Sólo lectura" tone="neutral" /></div></div>)}{!externalInstances.length && <Empty text="No hay otras instancias en la cuenta." />}</div>
        </Panel>
      </div>

      <Dialog open={Boolean(selectedOffer)} onOpenChange={(open) => { if (!open) { setSelectedOffer(null); setConfirmation(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirmar alquiler de GPU</DialogTitle><DialogDescription>El precio se validará de nuevo antes de aceptar la oferta. La instancia se destruirá al vencer el TTL aunque esté detenida.</DialogDescription></DialogHeader>
          {selectedOffer && <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4 text-sm"><p className="font-semibold">{selectedOffer.gpuName}</p><p className="mt-2 text-slate-400">${formatUsd(selectedOffer.hourlyUsd)}/h · máximo proyectado ${formatUsd(selectedOffer.projectedCostUsd)} · {ttlMinutes} minutos</p></div>}
          <label className="mt-4 block text-xs text-slate-400">Escribe ALQUILAR GPU<Input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="mt-2 font-mono" /></label>
          <DialogFooter><Button variant="outline" onClick={() => setSelectedOffer(null)}>Cancelar</Button><Button onClick={() => void rentSelectedOffer()} disabled={confirmation !== "ALQUILAR GPU" || Boolean(busy?.startsWith("rent:"))}>Alquilar con TTL</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(actionTarget)} onOpenChange={(open) => { if (!open) { setActionTarget(null); setConfirmation(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{actionTarget ? actionTitle(actionTarget.action) : "Controlar instancia"}</DialogTitle><DialogDescription>{actionTarget?.action === "destroy" ? "Esta operación es irreversible." : actionTarget?.action === "stop" ? "El disco seguirá generando un cargo hasta destruir la instancia." : "El TTL original no se extenderá."}</DialogDescription></DialogHeader>
          {actionTarget && <label className="mt-4 block text-xs text-slate-400">Escribe {expectedActionConfirmation(actionTarget)}<Input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="mt-2 font-mono" /></label>}
          <DialogFooter><Button variant="outline" onClick={() => setActionTarget(null)}>Cancelar</Button><Button variant={actionTarget?.action === "destroy" ? "destructive" : "default"} onClick={() => void runInstanceAction()} disabled={!actionTarget || confirmation !== expectedActionConfirmation(actionTarget) || Boolean(busy)}>{actionTarget ? actionTitle(actionTarget.action) : "Confirmar"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InstanceCard({ instance, leaseExpiresAt, now, onAction }: { instance: VastInstance; leaseExpiresAt: string | null; now: number; onAction: (action: VastInstanceAction) => void }) {
  return <article className="rounded-2xl border border-violet-300/10 bg-gradient-to-r from-violet-400/[0.06] to-transparent p-4"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{instance.gpuName}</p><StatusPill state={instance.status} tone={instance.status === "running" ? "success" : "warning"} /></div><p className="mt-1 text-xs text-slate-500">#{instance.id} · {formatVram(instance.gpuRamMb)} · {leaseExpiresAt ? formatCountdown(leaseExpiresAt, now) : "TTL no disponible"}</p></div><div className="flex flex-wrap gap-2">{instance.status !== "running" && <Button size="sm" variant="outline" onClick={() => onAction("start")}><Play />Iniciar</Button>}{instance.status === "running" && <Button size="sm" variant="outline" onClick={() => onAction("stop")}><Square />Detener</Button>}<Button size="sm" variant="destructive" onClick={() => onAction("destroy")}><Trash2 />Destruir</Button></div></div><div className="mt-4 grid gap-2 lg:grid-cols-2">{instance.sshCommand && <CommandRow icon={Terminal} label="SSH" command={instance.sshCommand} />}{instance.tunnelCommand && <CommandRow icon={ServerCog} label="Túnel ComfyUI" command={instance.tunnelCommand} />}</div>{instance.comfyUrl && <a href={instance.comfyUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-xs text-violet-300 hover:text-violet-200">Abrir proxy seguro de Vast <ExternalLink className="size-3" /></a>}</article>;
}

function CommandRow({ icon: Icon, label, command }: { icon: typeof Terminal; label: string; command: string }) {
  const [copied, setCopied] = useState(false);
  return <div className="flex min-w-0 items-center gap-3 rounded-xl border border-white/[0.07] bg-black/30 p-3"><Icon className="size-4 shrink-0 text-slate-500" /><div className="min-w-0 flex-1"><p className="text-[10px] uppercase tracking-wider text-slate-600">{label}</p><p className="truncate font-mono text-xs text-slate-300">{command}</p></div><button type="button" className="rounded-md p-2 text-slate-500 hover:bg-white/5 hover:text-white" onClick={() => { void navigator.clipboard.writeText(command); setCopied(true); window.setTimeout(() => setCopied(false), 1_500); }} aria-label={`Copiar ${label}`} title={copied ? "Copiado" : "Copiar"}><Copy className="size-4" /></button></div>;
}

function Metric({ label, value, prefix, suffix, detail, icon: Icon, tone }: { label: string; value: number | null; prefix?: string; suffix?: string; detail: string; icon: typeof Gauge; tone: string }) {
  return <article className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4"><div className="flex items-center justify-between"><p className="text-xs text-slate-500">{label}</p><Icon className={cn("size-4", tone)} /></div><p className="mt-3 text-2xl font-semibold">{value === null ? "—" : <>{prefix}<AnimatedMetric value={Math.round(value * 1_000_000) / 1_000_000} />{suffix}</>}</p><p className="mt-2 text-[11px] text-slate-600">{detail}</p></article>;
}

function Panel({ title, description, icon: Icon, children }: { title: string; description: string; icon: typeof Cpu; children: React.ReactNode }) {
  return <section className="rounded-[24px] border border-white/[0.08] bg-[#0d0d0f] p-4 sm:p-5"><div className="mb-5 flex items-start gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-400/10 text-violet-300"><Icon className="size-4" /></span><div><h2 className="font-semibold">{title}</h2><p className="mt-1 text-xs leading-5 text-slate-500">{description}</p></div></div>{children}</section>;
}

function SelectField({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: React.ReactNode }) {
  return <label className="block text-xs text-slate-400">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 h-10 w-full rounded-lg border border-white/10 bg-[#111113] px-3 text-sm text-white outline-none focus:border-violet-400/50 focus:ring-2 focus:ring-violet-400/20">{children}</select></label>;
}

function Data({ label, value }: { label: string; value: string }) { return <div className="rounded-lg bg-white/[0.025] p-2"><p className="text-[10px] text-slate-600">{label}</p><p className="mt-1 truncate text-slate-300" title={value}>{value}</p></div>; }
function Empty({ text }: { text: string }) { return <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-600">{text}</div>; }
function formatUsd(value: number) { return value.toFixed(value >= 1 ? 2 : 4); }
function formatVram(value: number) { return value ? `${(value / 1_000).toFixed(value % 1_000 ? 1 : 0)} GB VRAM` : "VRAM no informada"; }
function formatDateTime(value: string) { return new Intl.DateTimeFormat("es-VE", { dateStyle: "short", timeStyle: "short", timeZone: "America/Caracas" }).format(new Date(value)); }
function formatCountdown(value: string, now: number) { const remaining = Math.max(Date.parse(value) - now, 0); const minutes = Math.floor(remaining / 60_000); const seconds = Math.floor((remaining % 60_000) / 1_000); return remaining ? `Destrucción en ${minutes}:${String(seconds).padStart(2, "0")}` : "TTL vencido"; }
function lifecycleLabel(state: VastAdminOverview["lifecycle"]["state"]) { return ({ healthy: "operativo", degraded: "degradado", stale: "sin heartbeat", stopped: "detenido", not_configured: "sin configurar", error: "con error" } as const)[state]; }
function leaseTone(state: string): "success" | "warning" | "danger" | "neutral" { if (state === "running") return "success"; if (state === "failed" || state === "orphaned") return "danger"; if (["pending", "reconciling", "loading", "destroying"].includes(state)) return "warning"; return "neutral"; }
function actionTitle(action: VastInstanceAction) { return action === "start" ? "Iniciar GPU" : action === "stop" ? "Detener GPU" : "Destruir GPU"; }
function expectedActionConfirmation(target: ActionTarget) { return target.action === "destroy" ? `DESTRUIR ${target.instance.id}` : target.action === "start" ? "INICIAR GPU" : "DETENER GPU"; }
