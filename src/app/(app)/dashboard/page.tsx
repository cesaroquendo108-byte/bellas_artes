import Link from "next/link";
import { ArrowRight, FolderOpen, Images, Sparkles, WalletCards } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { MetricCard } from "@/components/metric-card";
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
    <PageHeading eyebrow="Centro de mando" title={`Hola${profile.displayName ? `, ${profile.displayName}` : ""}`} description="Tu estudio, tus archivos y cada movimiento de créditos en un mismo lugar." />
    <div className="grid gap-4 sm:grid-cols-3"><MetricCard label="Créditos disponibles" value={wallet.unlimited ? "Ilimitados" : wallet.balance.toLocaleString("es-VE")} detail={wallet.unlimited ? "Cuenta administrativa" : "Saldo transaccional"} /><MetricCard label="Plan" value={profile.planTier.toUpperCase()} detail="Define la retención de tus archivos" /><MetricCard label="Generación" value="Próximamente" detail="No consume créditos mientras está desactivada" /></div>
    <section className="mt-8 rounded-lg border border-violet-400/20 bg-violet-500/[0.07] p-6"><Sparkles className="size-5 text-violet-300" /><h2 className="mt-4 text-xl font-semibold">La generación está temporalmente pausada</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Estamos preparando la integración real. Hasta entonces, el sistema no crea imágenes simuladas ni descuenta créditos.</p></section>
    <div className="mt-8 grid gap-px overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.08] md:grid-cols-3">{shortcuts.map(({ icon: Icon, label, href }) => <Link key={href} href={href} className="flex items-center gap-3 bg-[#111113] p-5 text-sm font-medium hover:bg-[#17171a]"><Icon className="size-4 text-violet-300" />{label}<ArrowRight className="ml-auto size-4 text-slate-600" /></Link>)}</div>
  </>;
}
