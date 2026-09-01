import { PaymentReviewForm } from "@/components/admin/payment-review-form";
import { PageHeading } from "@/components/page-heading";
import { getPendingPayments } from "@/lib/payments/queries";

export default async function AdminPaymentsPage() {
  let payments: Awaited<ReturnType<typeof getPendingPayments>> = [];
  let error = "";
  try { payments = await getPendingPayments(); } catch (cause) { error = cause instanceof Error ? cause.message : "No se pudo abrir la bandeja."; }
  return <><PageHeading eyebrow="Administración" title="Revisión de pagos" description="La extracción automática orienta la revisión; la acreditación siempre requiere una decisión administrativa." />
    {error && <div className="mb-5 rounded-lg border border-amber-400/20 bg-amber-400/[0.06] p-5 text-sm text-amber-200">{error}</div>}
    <div className="space-y-4">{payments.map((payment) => <article key={payment.id} className="grid gap-5 rounded-lg border border-white/[0.08] bg-white/[0.03] p-5 lg:grid-cols-[1fr_320px]"><div><div className="flex flex-wrap items-center gap-2"><span className="rounded bg-violet-500/15 px-2 py-1 text-xs text-violet-200">{payment.package_id}</span><span className="text-xs text-slate-500">{payment.status}</span></div><dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-slate-500">Esperado</dt><dd>{Number(payment.expected_amount_bs).toLocaleString("es-VE")} Bs</dd></div><div><dt className="text-slate-500">Extraído</dt><dd>{payment.extracted_amount_bs ? `${Number(payment.extracted_amount_bs).toLocaleString("es-VE")} Bs` : "No detectado"}</dd></div><div><dt className="text-slate-500">Referencia</dt><dd>{payment.extracted_reference || "No detectada"}</dd></div><div><dt className="text-slate-500">Créditos</dt><dd>{Number(payment.credits).toLocaleString("es-VE")}</dd></div></dl><a href={payment.receiptUrl} target="_blank" rel="noreferrer" className="mt-5 inline-flex text-sm text-violet-300 hover:underline">Abrir comprobante</a></div><PaymentReviewForm paymentId={payment.id} extractedAmount={payment.extracted_amount_bs ? Number(payment.extracted_amount_bs) : null} extractedReference={payment.extracted_reference}/></article>)}{!error && !payments.length && <div className="rounded-lg border border-dashed border-white/10 p-12 text-center text-sm text-slate-500">No hay comprobantes pendientes.</div>}</div>
  </>;
}
