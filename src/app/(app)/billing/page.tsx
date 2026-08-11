import { PaymentForm } from "@/components/billing/payment-form";
import { PageHeading } from "@/components/page-heading";
import { CREDIT_PACKAGES } from "@/lib/credits/packages";
import { SpotlightCard, StatusPill } from "@/components/ui/motion-effects";

export default function BillingPage() {
  return <><div className="flex flex-wrap items-end justify-between gap-4"><PageHeading eyebrow="Planes y créditos" title="Compra solo lo que necesitas" description="El precio y los créditos se calculan en el servidor. Tu comprobante pasa por revisión antes de acreditar el saldo." /><StatusPill state="shadow" tone="warning" /></div>
    <div className="grid gap-4 lg:grid-cols-3">{Object.values(CREDIT_PACKAGES).map(pkg => <SpotlightCard key={pkg.id} className="rounded-2xl" contentClassName="p-6"><p className="text-sm font-semibold text-violet-300">{pkg.name}</p><p className="mt-4 text-4xl font-semibold tracking-tight">US${pkg.priceUsd}</p><p className="mt-2 text-sm text-slate-400">{pkg.credits.toLocaleString("es-VE")} créditos</p><div className="my-5 h-px bg-white/[0.06]" /><PaymentForm packageId={pkg.id} /></SpotlightCard>)}</div>
    <p className="mt-6 text-xs leading-5 text-slate-500">El monto en bolívares usa la tasa BCV vigente más 20%. La IA solo extrae monto, referencia y fecha; nunca aprueba el pago.</p>
  </>;
}
