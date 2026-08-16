import { Clock3, ReceiptText } from "lucide-react";

import { PaymentForm } from "@/components/billing/payment-form";
import { PageHeading } from "@/components/page-heading";
import { StatusPill } from "@/components/ui/motion-effects";
import { calculateBolivarAmount, formatBolivarAmount, getPaymentRate } from "@/lib/bcvRate";
import { CREDIT_PACKAGES } from "@/lib/credits/packages";

export default async function BillingPage() {
  let paymentRate: number | null = null;
  try {
    paymentRate = await getPaymentRate();
  } catch {
    paymentRate = null;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeading eyebrow="Planes y créditos" title="Compra sólo lo que necesitas" description="Recarga con Pago Móvil, envía tu comprobante y recibe tus créditos en Bellas Artes." />
        <div className="mb-8 flex flex-wrap gap-2"><StatusPill state="Pago Móvil" tone="success" /></div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {Object.values(CREDIT_PACKAGES).map((pkg, index) => (
          <article key={pkg.id} className={`workspace-surface relative overflow-hidden rounded-[26px] p-6 ${index === 1 ? "border-violet-300 shadow-[0_18px_46px_rgba(76,29,149,.1)]" : ""}`}>
            {index === 1 ? <span className="absolute right-4 top-4 rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-bold text-violet-700">Más elegido</span> : null}
            <span className="flex size-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700"><ReceiptText className="size-5" /></span>
            <p className="mt-5 text-sm font-semibold text-violet-700">{pkg.name}</p>
            <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <p className="text-4xl font-semibold tracking-[-0.045em] text-[#241f2e]">US${pkg.priceUsd}</p>
              <p className="text-sm font-medium text-[#6f6878]">
                {paymentRate === null
                  ? "(Monto temporalmente no disponible)"
                  : `(${formatBolivarAmount(calculateBolivarAmount(pkg.priceUsd, paymentRate))})`}
              </p>
            </div>
            <p className="mt-2 text-sm text-[#6f6878]">{pkg.credits.toLocaleString("es-VE")} créditos prepagados</p>
            <div className="my-5 h-px bg-[#eee7dc]" />
            <PaymentForm packageId={pkg.id} disabled={paymentRate === null} paymentAmount={paymentRate === null ? undefined : formatBolivarAmount(calculateBolivarAmount(pkg.priceUsd, paymentRate))} />
          </article>
        ))}
      </div>

      <div className="flex items-center gap-2 text-xs text-[#756d7c]">
        <Clock3 className="size-4 text-violet-500" />
        La equivalencia en bolívares se actualiza diariamente.
      </div>
    </div>
  );
}
