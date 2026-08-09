import { PaymentForm } from "@/components/billing/payment-form";
import { PageHeading } from "@/components/page-heading";
import { CREDIT_PACKAGES } from "@/lib/credits/packages";

export default function BillingPage() {
  return <><PageHeading eyebrow="Planes y créditos" title="Compra solo lo que necesitas" description="El precio y los créditos se calculan en el servidor. Tu comprobante pasa por revisión antes de acreditar el saldo." />
    <div className="grid gap-4 lg:grid-cols-3">{Object.values(CREDIT_PACKAGES).map(pkg => <article key={pkg.id} className="rounded-lg border border-white/[0.08] bg-white/[0.035] p-6"><p className="text-sm font-semibold text-violet-300">{pkg.name}</p><p className="mt-4 text-4xl font-semibold">US${pkg.priceUsd}</p><p className="mt-2 text-sm text-slate-400">{pkg.credits.toLocaleString("es-VE")} créditos</p><PaymentForm packageId={pkg.id} /></article>)}</div>
    <p className="mt-6 text-xs leading-5 text-slate-500">El monto en bolívares usa la tasa BCV vigente más 20%. La IA solo extrae monto, referencia y fecha; nunca aprueba el pago.</p>
  </>;
}

