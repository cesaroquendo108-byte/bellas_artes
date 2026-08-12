"use client";

import { useActionState } from "react";
import { submitPaymentForm, type PaymentActionState } from "@/app/actions/payment";

const initialState: PaymentActionState = { ok: false, message: "" };

export function PaymentForm({ packageId }: { packageId: "curioso" | "creador" | "estudio" }) {
  const [state, action, pending] = useActionState(submitPaymentForm, initialState);
  return <form action={action} className="mt-5 space-y-3">
    <input type="hidden" name="packageId" value={packageId} />
    <input name="receipt" type="file" accept="image/jpeg,image/png,image/webp" required className="block w-full rounded-xl border border-dashed border-[#d8cfca] bg-[#faf7f0] p-2 text-xs text-[#756d7c] file:mr-3 file:rounded-lg file:border-0 file:bg-violet-100 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-violet-700" />
    <button disabled={pending} className="w-full rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-200 transition hover:bg-violet-500 disabled:opacity-50">{pending ? "Enviando..." : "Enviar comprobante"}</button>
    {state.message && <p className={`text-xs ${state.ok ? "text-emerald-300" : "text-red-300"}`}>{state.message}</p>}
  </form>;
}
