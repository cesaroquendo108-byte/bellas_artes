"use client";

import { useActionState, useId, useState } from "react";
import { submitPaymentForm, type PaymentActionState } from "@/app/actions/payment";

const initialState: PaymentActionState = { ok: false, message: "" };

export function PaymentForm({ packageId, disabled = false, paymentAmount }: { packageId: "curioso" | "creador" | "estudio"; disabled?: boolean; paymentAmount?: string }) {
  const [state, action, pending] = useActionState(submitPaymentForm, initialState);
  const [fileName, setFileName] = useState("");
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);
  const inputId = useId();
  return <form action={action} className="mt-5 space-y-3">
    <input type="hidden" name="packageId" value={packageId} />
    {!showPaymentDetails ? <button
      type="button"
      disabled={disabled}
      onClick={() => setShowPaymentDetails(true)}
      className="w-full rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-200 transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
    >{disabled ? "Monto no disponible" : "Pagar"}</button> : null}
    {showPaymentDetails ? <div className="rounded-xl border border-violet-200 bg-violet-50/70 p-4 text-sm text-[#3b3344]">
      <p className="font-semibold text-[#241f2e]">Datos para pagar por Pago Móvil</p>
      <dl className="mt-3 grid gap-2 text-xs">
        <div className="flex items-center justify-between gap-4"><dt className="text-[#817887]">Banco</dt><dd className="font-semibold">BNC</dd></div>
        <div className="flex items-center justify-between gap-4"><dt className="text-[#817887]">Teléfono</dt><dd className="font-semibold">04126319964</dd></div>
        <div className="flex items-center justify-between gap-4"><dt className="text-[#817887]">Cédula</dt><dd className="font-semibold">30821164</dd></div>
        {paymentAmount ? <div className="flex items-center justify-between gap-4 border-t border-violet-200 pt-2"><dt className="text-[#817887]">Monto a pagar</dt><dd className="font-semibold text-violet-700">{paymentAmount}</dd></div> : null}
      </dl>
      <p className="mt-3 border-t border-violet-200 pt-3 text-xs text-[#6f6878]">Realiza el pago por el monto exacto y luego adjunta el comprobante.</p>
    </div> : null}
    {showPaymentDetails ? <>
    <input
      id={inputId}
      name="receipt"
      type="file"
      accept="image/jpeg,image/png,image/webp"
      required
      disabled={disabled || pending}
      className="sr-only"
      onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")}
    />
    <label htmlFor={inputId} className={`flex min-h-12 items-center gap-3 rounded-xl border border-dashed border-[#d8cfca] bg-[#faf7f0] p-2 text-xs text-[#756d7c] transition ${disabled || pending ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:border-violet-400/60"}`}>
      <span className="shrink-0 rounded-lg bg-violet-100 px-3 py-2 font-semibold text-violet-700">Seleccionar comprobante</span>
      <span className="min-w-0 truncate">{fileName || "Ningún archivo seleccionado"}</span>
    </label>
    <button type="submit" disabled={disabled || pending} className="w-full rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-200 transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50">{disabled ? "Monto no disponible" : pending ? "Enviando..." : "Enviar comprobante"}</button>
    </> : null}
    {state.message && <p className={`text-xs ${state.ok ? "text-emerald-300" : "text-red-300"}`}>{state.message}</p>}
  </form>;
}
