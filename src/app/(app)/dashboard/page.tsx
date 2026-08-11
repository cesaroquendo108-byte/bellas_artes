import Link from "next/link";
import { ArrowRight, FolderOpen, Images, Sparkles, WalletCards, WandSparkles } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { MetricCard } from "@/components/metric-card";
import { ShimmerLink, SpotlightCard, StatusPill } from "@/components/ui/motion-effects";
import { requireUser } from "@/lib/auth";
import { getWalletSummary } from "@/lib/credits/queries";

export default async function DashboardPage() {
  const [{ profile }, wallet] = await Promise.all([requireUser(), getWalletSummary()]);
  const shortcuts = [
    { icon: FolderOpen, label: "Abrir biblioteca", href: "/assets" },
    { icon: WalletCards, label: "Ver créditos", href: "/credits" },
    { icon: Images, label: "Comprar créditos", href: "/billing" },
  ];
  return <>
    <div className="relative overflow-hidden rounded-[28px] border border-white/[0.08] bg-gradient-to-br from-violet-500/[0.12] via-[#111114] to-fuchsia-500/[0.06] p-6 shadow-2xl shadow-violet-950/10 sm:p-8">
      <div className="pointer-events-none absolute -right-16 -top-24 size-64 rounded-full bg-fuchsia-400/10 blur-3xl" />
      <PageHeading eyebrow="Centro de mando" title={`Hola${profile.displayName ? `, ${profile.displayName}` : ""}`} description="Tu estudio, tus archivos y cada movimiento de créditos en un mismo lugar." />
      <div className="flex flex-wrap items-center gap-3"><StatusPill state="ready" tone="info" /><span className="text-xs text-slate-500">Cuenta {profile.planTier.toUpperCase()}</span><ShimmerLink href="/image" className="ml-auto px-4 py-2 text-xs">Abrir estudio <WandSparkles className="size-3.5" /></ShimmerLink></div>
    </div>
    <div className="mt-6 grid gap-4 sm:grid-cols-3"><MetricCard label="Créditos disponibles" value={wallet.unlimited ? "Ilimitados" : wallet.balance.toLocaleString("es-VE")} numericValue={wallet.unlimited ? undefined : wallet.balance} detail={wallet.unlimited ? "Cuenta administrativa" : "Saldo transaccional"} /><MetricCard label="Plan" value={profile.planTier.toUpperCase()} detail="Define la retención de tus archivos" /><MetricCard label="Generación" value="Próximamente" detail="No consume créditos mientras está desactivada" /></div>
    <SpotlightCard className="mt-6 rounded-[24px] border-violet-400/20 bg-violet-500/[0.07]" contentClassName="p-6"><div className="flex items-start gap-4"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-400/15 text-violet-200"><Sparkles className="size-5" /></span><div><StatusPill state="preparing" tone="warning" /><h2 className="mt-4 text-xl font-semibold">La generación está temporalmente pausada</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Estamos preparando la integración real. Hasta entonces, el sistema no crea imágenes simuladas ni descuenta créditos.</p></div></div></SpotlightCard>
    <div className="mt-6 grid gap-3 sm:grid-cols-3">{shortcuts.map(({ icon: Icon, label, href }) => <Link key={href} href={href} className="group flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 text-sm font-medium transition hover:-translate-y-0.5 hover:border-violet-300/20 hover:bg-white/[0.06]"><Icon className="size-4 text-violet-300" />{label}<ArrowRight className="ml-auto size-4 text-slate-600 transition group-hover:translate-x-1 group-hover:text-violet-200" /></Link>)}</div>
  </>;
}
