import Link from "next/link";
import {
  ArrowRight,
  Clapperboard,
  Clock3,
  FolderOpen,
  Image as ImageIcon,
  Library,
  Mic2,
  Palette,
  PanelsTopLeft,
  Sparkles,
  UsersRound,
  WalletCards,
} from "lucide-react";

import { MetricCard } from "@/components/metric-card";
import { StatusPill } from "@/components/ui/motion-effects";
import { SectionHeader } from "@/components/ui/workspace";
import { LiquidCreateActions } from "@/components/workspace/liquid-create-actions";
import { getAssets } from "@/lib/assets/queries";
import { requireUser } from "@/lib/auth";
import { getWalletSummary } from "@/lib/credits/queries";
import { listGenerationCapabilities } from "@/lib/generation/capabilities";
import { getProjectsForPage } from "@/lib/story/projects";

const quickStarts = [
  { label: "Estudio de imagen", detail: "Flux Schnell · Admin Preview", href: "/image", icon: ImageIcon, accent: "violet" },
  { label: "Suite de video", detail: "Workflows en preparación", href: "/video", icon: Clapperboard, accent: "fuchsia" },
  { label: "Suite de audio", detail: "Proveedor en preparación", href: "/audio/my", icon: Mic2, accent: "cyan" },
  { label: "Abrir Director", detail: "Escenas y narrativa", href: "/director", icon: PanelsTopLeft, accent: "violet" },
  { label: "Personajes", detail: "Referencias en preparación", href: "/characters", icon: UsersRound, accent: "fuchsia" },
  { label: "Kit de marca", detail: "Colores, logos y guías", href: "/brand-kits", icon: Palette, accent: "cyan" },
] as const;

const capabilityLabels: Record<string, { label: string; tone: "neutral" | "warning" | "info" | "success" }> = {
  configured: { label: "Operativo", tone: "success" },
  admin_only: { label: "Sólo admin", tone: "info" },
  beta: { label: "Beta", tone: "info" },
  contract_only: { label: "En preparación", tone: "warning" },
  disabled: { label: "Pausado", tone: "neutral" },
};

export default async function DashboardPage() {
  const [{ profile }, wallet, assetResult, projectResult] = await Promise.all([
    requireUser(),
    getWalletSummary(),
    getAssets({}, undefined, 6).catch(() => null),
    getProjectsForPage({ scope: "mine", limit: 4 }).catch(() => ({ projects: [], nextCursor: null, error: "No disponible" })),
  ]);
  const capabilities = listGenerationCapabilities();
  const assets = assetResult?.assets ?? [];
  const projects = projectResult.projects ?? [];
  const firstName = profile.displayName?.trim().split(/\s+/)[0];

  return (
    <div className="space-y-8">
      <section className="workspace-surface relative overflow-hidden rounded-[30px] p-5 sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-24 size-72 rounded-full bg-violet-300/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 size-60 rounded-full bg-fuchsia-200/20 blur-3xl" />
        <div className="relative grid gap-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill state="Estudio listo" tone="success" />
              <span className="text-xs font-medium text-[#827986]">Plan {profile.planTier.toUpperCase()}</span>
            </div>
            <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-violet-700">Centro creativo</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.045em] text-[#241f2e] sm:text-5xl">
              Hola{firstName ? `, ${firstName}` : ""}. ¿Qué vamos a crear hoy?
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-[#6f6878] sm:text-base">
              Empieza una pieza, organiza tus referencias o continúa un proyecto. Las funciones muestran su disponibilidad real antes de consumir créditos.
            </p>
          </div>
          <LiquidCreateActions />
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Créditos disponibles" value={wallet.unlimited ? "Ilimitados" : wallet.balance.toLocaleString("es-VE")} numericValue={wallet.unlimited ? undefined : wallet.balance} detail={wallet.unlimited ? "Cuenta administrativa" : "Saldo real de tu billetera"} icon={<WalletCards className="size-4" />} tone="violet" />
        <MetricCard label="Archivos recientes" value={String(assets.length)} numericValue={assets.length} detail={assetResult ? "Últimos resultados consultados" : "Biblioteca no disponible"} icon={<Library className="size-4" />} tone="cyan" />
        <MetricCard label="Proyectos recientes" value={String(projects.length)} numericValue={projects.length} detail={projectResult.error ? "Persistencia no disponible" : "Director e historias"} icon={<PanelsTopLeft className="size-4" />} tone="fuchsia" />
        <MetricCard label="Generación pública" value="Pausada" detail="No descuenta créditos" icon={<Clock3 className="size-4" />} tone="neutral" />
      </section>

      <section>
        <SectionHeader eyebrow="Accesos rápidos" title="Empieza desde una herramienta" description="Una entrada clara para cada tipo de creación, con su estado visible desde el comienzo." />
        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
          {quickStarts.map(({ label, detail, href, icon: Icon, accent }) => (
            <Link key={href} href={href} className="workspace-surface group min-w-0 rounded-2xl p-4 transition hover:-translate-y-0.5 hover:border-violet-200 motion-reduce:transform-none">
              <span className={`flex size-10 items-center justify-center rounded-2xl ${accent === "violet" ? "bg-violet-100 text-violet-700" : accent === "fuchsia" ? "bg-fuchsia-100 text-fuchsia-700" : "bg-cyan-50 text-cyan-700"}`}><Icon className="size-4.5" /></span>
              <span className="mt-5 block text-sm font-semibold text-[#241f2e]">{label}</span>
              <span className="mt-1 block text-[10px] leading-4 text-[#827986]">{detail}</span>
              <ArrowRight className="mt-4 size-4 text-[#b0a6b3] transition group-hover:translate-x-1 group-hover:text-violet-700" />
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(18rem,.65fr)]">
        <section className="workspace-surface rounded-[26px] p-5 sm:p-6">
          <SectionHeader eyebrow="Actividad" title="Tus últimos archivos" description="Resultados privados con enlaces temporales firmados." action={<Link href="/assets" className="text-xs font-semibold text-violet-700 hover:underline">Abrir biblioteca</Link>} />
          {assets.length ? (
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {assets.slice(0, 6).map((asset) => (
                <a key={asset.id} href={asset.signedUrl} target="_blank" rel="noreferrer" className="group overflow-hidden rounded-2xl border border-[#e6ded1] bg-[#f1ece3]">
                  <div className="aspect-square overflow-hidden bg-[#e8e0d5]">
                    {asset.type === "image" ? <div role="img" aria-label={asset.name} className="size-full bg-cover bg-center transition duration-500 group-hover:scale-105 motion-reduce:transform-none" style={{ backgroundImage: `url(${asset.signedUrl})` }} /> : <div className="flex size-full items-center justify-center bg-gradient-to-br from-violet-100 to-fuchsia-100"><FolderOpen className="size-7 text-violet-600" /></div>}
                  </div>
                  <div className="p-3"><p className="truncate text-xs font-semibold text-[#3f3748]">{asset.name}</p><p className="mt-1 text-[10px] capitalize text-[#8b828f]">{asset.type}</p></div>
                </a>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-[#dcd2c4] bg-[#faf7f0] p-7 text-center">
              <FolderOpen className="mx-auto size-7 text-[#b0a6b3]" />
              <p className="mt-3 text-sm font-semibold text-[#3f3748]">Tu biblioteca está lista para recibir contenido</p>
              <p className="mt-1 text-xs text-[#827986]">Los resultados reales aparecerán aquí.</p>
            </div>
          )}
        </section>

        <section className="workspace-surface rounded-[26px] p-5 sm:p-6">
          <SectionHeader eyebrow="Disponibilidad" title="Capacidades reales" description="El estado proviene de la configuración y de cada workflow." />
          <div className="mt-5 space-y-3">
            {capabilities.slice(0, 6).map((capability) => {
              const status = capabilityLabels[capability.status];
              return (
                <div key={capability.id} className="flex items-center gap-3 rounded-2xl border border-[#ebe4da] bg-white/70 p-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><Sparkles className="size-4" /></span>
                  <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-[#3f3748]">{capability.label}</p><p className="mt-1 truncate text-[10px] text-[#8b828f]">{capability.workflowVersion}</p></div>
                  <StatusPill state={status.label} tone={status.tone} />
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <section className="rounded-[26px] border border-violet-200 bg-gradient-to-r from-violet-50 via-white to-fuchsia-50 p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-lg shadow-violet-200"><Sparkles className="size-5" /></span>
          <div className="min-w-0 flex-1"><StatusPill state="Controlado" tone="info" /><h2 className="mt-2 text-lg font-semibold text-[#241f2e]">La generación continúa en acceso restringido</h2><p className="mt-1 text-sm leading-6 text-[#6f6878]">Bellas Artes no simula resultados ni descuenta créditos cuando un workflow no está disponible.</p></div>
          <Link href="/credits" className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-200 bg-white px-4 py-2.5 text-sm font-semibold text-violet-700 shadow-sm">Ver mi cuenta <ArrowRight className="size-4" /></Link>
        </div>
      </section>
    </div>
  );
}
