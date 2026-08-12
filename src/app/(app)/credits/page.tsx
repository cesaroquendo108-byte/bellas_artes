import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, History, ShieldCheck, WalletCards } from "lucide-react";

import { MetricCard } from "@/components/metric-card";
import { PageHeading } from "@/components/page-heading";
import { StatusPill } from "@/components/ui/motion-effects";
import { getCreditLedger, getWalletSummary } from "@/lib/credits/queries";

export default async function CreditsPage({ searchParams }: { searchParams: Promise<{ cursor?: string }> }) {
  const params = await searchParams;
  const [wallet, ledger] = await Promise.all([getWalletSummary(), getCreditLedger(params.cursor)]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeading eyebrow="Créditos" title={wallet.unlimited ? "Uso ilimitado" : "Tu billetera creativa"} description="Cada compra, bono, ajuste y consumo queda registrado en un historial inmutable." />
        <div className="mb-8"><StatusPill state={wallet.unlimited ? "Cuenta administrativa" : "Saldo activo"} tone="success" /></div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Créditos disponibles" value={wallet.unlimited ? "Ilimitados" : wallet.balance.toLocaleString("es-VE")} numericValue={wallet.unlimited ? undefined : wallet.balance} detail="Saldo real disponible" icon={<WalletCards className="size-4" />} tone="violet" />
        <MetricCard label="Movimientos visibles" value={String(ledger.entries.length)} numericValue={ledger.entries.length} detail="Página actual del ledger" icon={<History className="size-4" />} tone="cyan" />
        <MetricCard label="Integridad" value="Protegida" detail="Historial inmutable" icon={<ShieldCheck className="size-4" />} tone="fuchsia" />
      </div>

      <section className="workspace-surface overflow-hidden rounded-[26px]">
        <div className="flex items-center justify-between border-b border-[#e6ded1] bg-white/70 px-5 py-4">
          <div><h2 className="text-sm font-semibold text-[#241f2e]">Historial de movimientos</h2><p className="mt-1 text-xs text-[#827986]">Ordenado del más reciente al más antiguo.</p></div>
          <StatusPill state="Ledger" tone="neutral" />
        </div>
        {ledger.entries.length ? ledger.entries.map((entry) => {
          const positive = entry.creditDelta >= 0;
          const Icon = positive ? ArrowDownLeft : ArrowUpRight;
          return (
            <div key={entry.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-t border-[#eee7dc] px-4 py-4 first:border-t-0 sm:px-5">
              <span className={`flex size-10 items-center justify-center rounded-2xl ${positive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}><Icon className="size-4" /></span>
              <div className="min-w-0"><p className="truncate text-sm font-semibold text-[#3f3748]">{entry.description || entry.type}</p><p className="mt-1 text-[10px] text-[#8b828f]">{new Date(entry.createdAt).toLocaleString("es-VE")}</p></div>
              <div className="text-right"><p className={`text-sm font-bold ${positive ? "text-emerald-700" : "text-rose-700"}`}>{positive ? "+" : ""}{entry.creditDelta.toLocaleString("es-VE")}</p><p className="mt-1 text-[10px] text-[#8b828f]">Saldo {entry.balanceAfter.toLocaleString("es-VE")}</p></div>
            </div>
          );
        }) : <p className="p-10 text-center text-sm text-[#827986]">Aún no hay movimientos.</p>}
      </section>

      <div className="flex flex-wrap gap-3">
        {ledger.nextCursor ? <Link href={`/credits?cursor=${encodeURIComponent(ledger.nextCursor)}`} className="rounded-xl border border-[#ded4c6] bg-white px-4 py-2 text-sm font-semibold text-[#4c4455] shadow-sm hover:border-violet-200 hover:text-violet-700">Ver movimientos anteriores</Link> : null}
        <Link href="/billing" className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-200">Comprar créditos</Link>
      </div>
    </div>
  );
}
