import { BadgeCheck, Landmark, ReceiptText } from "lucide-react";

import { PaymentForm } from "@/components/billing/payment-form";
import { PageHeading } from "@/components/page-heading";
import { StatusPill } from "@/components/ui/motion-effects";
import { CREDIT_PACKAGES } from "@/lib/credits/packages";

export default function BillingPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeading eyebrow="Planes y créditos" title="Compra sólo lo que necesitas" description="Recarga con Pago Móvil, envía tu comprobante y recibe los créditos después de la revisión administrativa." />
        <div className="mb-8 flex flex-wrap gap-2"><StatusPill state="Pago Móvil" tone="success" /><StatusPill state="Revisión manual" tone="info" /></div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {Object.values(CREDIT_PACKAGES).map((pkg, index) => (
          <article key={pkg.id} className={`workspace-surface relative overflow-hidden rounded-[26px] p-6 ${index === 1 ? "border-violet-300 shadow-[0_18px_46px_rgba(76,29,149,.1)]" : ""}`}>
            {index === 1 ? <span className="absolute right-4 top-4 rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-bold text-violet-700">Más elegido</span> : null}
            <span className="flex size-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700"><ReceiptText className="size-5" /></span>
            <p className="mt-5 text-sm font-semibold text-violet-700">{pkg.name}</p>
            <p className="mt-3 text-4xl font-semibold tracking-[-0.045em] text-[#241f2e]">US${pkg.priceUsd}</p>
            <p className="mt-2 text-sm text-[#6f6878]">{pkg.credits.toLocaleString("es-VE")} créditos prepagados</p>
            <div className="my-5 h-px bg-[#eee7dc]" />
            <PaymentForm packageId={pkg.id} />
          </article>
        ))}
      </div>

      <section className="grid gap-3 md:grid-cols-2">
        <div className="workspace-surface flex items-start gap-3 rounded-2xl p-4"><span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><Landmark className="size-4" /></span><div><p className="text-sm font-semibold text-[#3f3748]">Monto en bolívares</p><p className="mt-1 text-xs leading-5 text-[#756d7c]">Se calcula con la tasa BCV vigente más el margen configurado en el servidor.</p></div></div>
        <div className="workspace-surface flex items-start gap-3 rounded-2xl p-4"><span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><BadgeCheck className="size-4" /></span><div><p className="text-sm font-semibold text-[#3f3748]">Aprobación humana</p><p className="mt-1 text-xs leading-5 text-[#756d7c]">La IA sólo extrae datos del comprobante; nunca aprueba el pago automáticamente.</p></div></div>
      </section>
    </div>
  );
}
