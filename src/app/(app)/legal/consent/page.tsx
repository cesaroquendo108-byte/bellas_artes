import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LegalConsentForm } from "@/components/legal/legal-consent-form";
import { requireUser } from "@/lib/auth";
import { getLegalConsentStatus } from "@/lib/legal/consent";
import { safeNextPath } from "@/app/login/actions";
import { acceptLegalConsent } from "./actions";

export const metadata: Metadata = {
  title: "Aceptación legal · Bellas Artes",
  robots: { index: false, follow: false },
};

export default async function LegalConsentPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const nextPath = await safeNextPath(params.next ?? "/dashboard");
  const { user } = await requireUser();
  const status = await getLegalConsentStatus(user.id);
  if (status.complete) redirect(nextPath);

  return (
    <main className="min-h-screen bg-[#09090b] px-4 py-16 text-white sm:px-6">
      <section className="mx-auto max-w-xl rounded-2xl border border-white/[0.08] bg-[#111114] p-7 shadow-2xl sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[.18em] text-violet-300">Antes de crear</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">Confirma las reglas de Bellas Artes</h1>
        <p className="mt-4 text-sm leading-6 text-slate-400">
          Necesitamos guardar tu aceptación versionada antes de habilitar generación y publicaciones comunitarias. Puedes revisar los documentos completos en cualquier momento.
        </p>
        <LegalConsentForm action={acceptLegalConsent} nextPath={nextPath} error={params.error === "required" ? "Debes marcar ambas casillas para continuar." : undefined} />
      </section>
    </main>
  );
}
