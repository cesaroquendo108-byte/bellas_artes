import Link from "next/link";
import { PageHeading } from "@/components/page-heading";
import { AnimatedMetric, SpotlightCard, StatusPill } from "@/components/ui/motion-effects";
import { getCreditLedger, getWalletSummary } from "@/lib/credits/queries";

export default async function CreditsPage({ searchParams }: { searchParams: Promise<{ cursor?: string }> }) {
  const { cursor } = await searchParams; const [wallet, ledger] = await Promise.all([getWalletSummary(), getCreditLedger(cursor)]);
  return <><div className="flex flex-wrap items-end justify-between gap-4"><PageHeading eyebrow="Créditos" title={wallet.unlimited ? "Uso ilimitado" : `${wallet.balance.toLocaleString("es-VE")} créditos`} description="Cada compra, bono, ajuste y consumo queda registrado en un historial inmutable." /><StatusPill state={wallet.unlimited ? "Cuenta administrativa" : "Créditos activos"} tone="success" /></div>
    <SpotlightCard className="rounded-2xl" contentClassName="overflow-hidden"><div className="grid grid-cols-[1fr_auto] bg-white/[0.04] px-5 py-3 text-xs uppercase tracking-[.14em] text-slate-500"><span>Movimiento</span><span>Créditos</span></div>{ledger.entries.length ? ledger.entries.map(e => <div key={e.id} className="grid grid-cols-[1fr_auto] gap-4 border-t border-white/[0.06] px-5 py-4"><div><p className="text-sm font-medium text-white">{e.description || e.type}</p><p className="mt-1 text-xs text-slate-500">{new Date(e.createdAt).toLocaleString("es-VE")}</p></div><div className="text-right"><p className={e.creditDelta >= 0 ? "text-emerald-300" : "text-red-300"}>{e.creditDelta >= 0 ? "+" : ""}<AnimatedMetric value={Math.abs(e.creditDelta)} /></p><p className="text-xs text-slate-600">Saldo {e.balanceAfter.toLocaleString("es-VE")}</p></div></div>) : <p className="p-8 text-center text-sm text-slate-500">Aún no hay movimientos.</p>}</SpotlightCard>
    {ledger.nextCursor && <Link href={`/credits?cursor=${encodeURIComponent(ledger.nextCursor)}`} className="mt-5 inline-flex rounded-xl border border-white/10 px-4 py-2 text-sm transition hover:border-violet-300/30 hover:bg-white/[0.04]">Ver movimientos anteriores</Link>}
  </>;
}
