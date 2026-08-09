"use client";

import { useActionState } from "react";
import { submitPaymentForm, type PaymentActionState } from "@/app/actions/payment";

const initialState: PaymentActionState = { ok: false, message: "" };

export function PaymentForm({ packageId }: { packageId: "curioso" | "creador" | "estudio" }) {
  const [state, action, pending] = useActionState(submitPaymentForm, initialState);
  return <form action={action} className="mt-5 space-y-3">
    <input type="hidden" name="packageId" value={packageId} />
    <input name="receipt" type="file" accept="image/jpeg,image/png,image/webp" required className="block w-full text-xs text-slate-400 file:mr-3 file:rounded-md file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white" />
    <button disabled={pending} className="w-full rounded-md bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Enviando..." : "Enviar comprobante"}</button>
    {state.message && <p className={`text-xs ${state.ok ? "text-emerald-300" : "text-red-300"}`}>{state.message}</p>}
  </form>;
}

