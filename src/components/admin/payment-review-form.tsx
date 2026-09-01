"use client";

import { useActionState } from "react";

import { reviewPaymentForm, type PaymentActionState } from "@/app/actions/payment";

const initialState: PaymentActionState = { ok: false, message: "" };

export function PaymentReviewForm({
  paymentId,
  extractedAmount,
  extractedReference,
}: {
  paymentId: string;
  extractedAmount: number | null;
  extractedReference: string | null;
}) {
  const [state, action, pending] = useActionState(reviewPaymentForm, initialState);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="paymentId" value={paymentId} />
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
        <label className="space-y-1 text-xs text-slate-400">
          <span>Monto verificado (Bs)</span>
          <input
            name="manualAmountBs"
            type="number"
            min="0.01"
            step="0.01"
            inputMode="decimal"
            defaultValue={extractedAmount ?? ""}
            placeholder="Solo si necesitas corregirlo"
            disabled={pending}
            className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-violet-400"
          />
        </label>
        <label className="space-y-1 text-xs text-slate-400">
          <span>Referencia verificada</span>
          <input
            name="manualReference"
            defaultValue={extractedReference ?? ""}
            placeholder="Solo si necesitas corregirla"
            disabled={pending}
            className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-violet-400"
          />
        </label>
      </div>
      <label className="flex items-start gap-2 text-[11px] leading-4 text-slate-400">
        <input name="manualCorrection" value="on" type="checkbox" className="mt-0.5 accent-violet-500" disabled={pending} />
        <span>Usar estos datos como corrección manual. Es obligatorio marcarlo si la extracción no detectó el monto o la referencia.</span>
      </label>
      <textarea
        name="note"
        placeholder="Nota de revisión"
        disabled={pending}
        className="min-h-24 w-full rounded-md border border-white/10 bg-black/30 p-3 text-sm outline-none focus:border-violet-400"
      />
      <p className="text-[11px] leading-4 text-slate-500">Si la extracción falló, completa ambos datos antes de aprobar.</p>
      <div className="grid grid-cols-2 gap-2">
        <button name="decision" value="rejected" disabled={pending} className="rounded-md border border-red-400/20 px-3 py-2 text-sm text-red-300 disabled:opacity-50">
          {pending ? "Guardando..." : "Rechazar"}
        </button>
        <button name="decision" value="approved" disabled={pending} className="rounded-md bg-violet-600 px-3 py-2 text-sm font-semibold disabled:opacity-50">
          {pending ? "Guardando..." : "Aprobar"}
        </button>
      </div>
      {state.message ? <p aria-live="polite" className={`text-xs ${state.ok ? "text-emerald-300" : "text-red-300"}`}>{state.message}</p> : null}
    </form>
  );
}
