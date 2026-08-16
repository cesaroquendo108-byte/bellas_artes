import { PageHeading } from "@/components/page-heading";
import { updateProfile } from "@/app/actions/settings";
import { requireUser } from "@/lib/auth";
import { SpotlightCard, StatusPill } from "@/components/ui/motion-effects";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; message?: string }>;
}) {
  const [{ profile }, params] = await Promise.all([requireUser(), searchParams]);

  return (
    <>
      <PageHeading
        eyebrow="Ajustes"
        title="Tu cuenta"
        description="Actualiza tu identidad visible y consulta las preferencias asociadas a tu estudio."
      />
      <div className="max-w-2xl space-y-5">
        {params.saved === "1" && (
          <p className="rounded-md border border-emerald-400/20 bg-emerald-400/[0.07] px-4 py-3 text-sm text-emerald-200">
            Nombre actualizado.
          </p>
        )}
        {params.message && (
          <p className="rounded-md border border-amber-400/20 bg-amber-400/[0.07] px-4 py-3 text-sm text-amber-200">
            {params.message}
          </p>
        )}

        <SpotlightCard className="max-w-2xl rounded-2xl" contentClassName="p-5"><form action={updateProfile}>
          <label htmlFor="displayName" className="text-sm font-medium text-white">
            Nombre visible
          </label>
          <p className="mt-1 text-sm text-slate-500">Aparece en la navegación y dentro de tu estudio.</p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              id="displayName"
              name="displayName"
              defaultValue={profile.displayName ?? ""}
              minLength={2}
              maxLength={80}
              required
              className="h-11 flex-1 rounded-xl border border-[#ded4c6] bg-white px-3 text-sm text-[#241f2e] outline-none transition focus:border-violet-400 focus:ring-3 focus:ring-violet-200/50"
            />
            <button type="submit" className="h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-white transition hover:bg-violet-500">
              Guardar
            </button>
          </div>
        </form></SpotlightCard>

        <SpotlightCard className="max-w-2xl rounded-2xl" contentClassName="divide-y divide-white/[0.06]">
          {[
            ["Correo", profile.email],
            ["Plan", profile.planTier.toUpperCase()],
            ["Rol", profile.role === "admin" ? "Administrador" : "Usuario"],
          ].map(([key, value]) => (
            <div key={key} className="grid gap-1 px-5 py-4 sm:grid-cols-[180px_1fr]">
              <span className="text-sm text-slate-500">{key}</span>
              <span className="flex items-center justify-between gap-3 text-sm text-white">{value}{key === "Rol" && <StatusPill state={String(value)} tone={profile.role === "admin" ? "info" : "neutral"} />}</span>
            </div>
          ))}
        </SpotlightCard>
      </div>
    </>
  );
}
