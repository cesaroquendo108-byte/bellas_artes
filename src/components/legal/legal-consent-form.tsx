"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Guardando..." : "Aceptar y continuar"}
    </button>
  );
}

export function LegalConsentForm({
  action,
  nextPath,
  error,
}: {
  action: (formData: FormData) => void | Promise<void>;
  nextPath: string;
  error?: string;
}) {
  return (
    <form action={action} className="mt-8 space-y-5">
      <input type="hidden" name="next" value={nextPath} />
      <label className="flex gap-3 text-sm leading-6 text-slate-300">
        <input name="termsAccepted" type="checkbox" required className="mt-1 accent-violet-500" />
        <span>
          He leído y acepto los <Link href="/terms" target="_blank" className="text-violet-300 underline">Términos de uso</Link>.
        </span>
      </label>
      <label className="flex gap-3 text-sm leading-6 text-slate-300">
        <input name="moderationAccepted" type="checkbox" required className="mt-1 accent-violet-500" />
        <span>
          Acepto las reglas de moderación: no usaré Bellas Artes para contenido ilegal, abuso sexual infantil, suplantación o deepfakes de personas reales sin consentimiento.
        </span>
      </label>
      {error && <p className="rounded-lg border border-red-400/20 bg-red-500/10 p-3 text-xs text-red-300">{error}</p>}
      <SubmitButton />
    </form>
  );
}
