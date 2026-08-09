import { PageHeading } from "@/components/page-heading";
import { updateProfile } from "@/app/actions/settings";
import { requireUser } from "@/lib/auth";

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

        <form action={updateProfile} className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-5">
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
              className="h-10 flex-1 rounded-md border border-white/10 bg-black/30 px-3 text-sm text-white outline-none transition focus:border-violet-400/60"
            />
            <button type="submit" className="h-10 rounded-md bg-primary px-4 text-sm font-semibold text-white transition hover:bg-violet-500">
              Guardar
            </button>
          </div>
        </form>

        <div className="divide-y divide-white/[0.06] rounded-lg border border-white/[0.08] bg-white/[0.03]">
          {[
            ["Correo", profile.email],
            ["Plan", profile.planTier.toUpperCase()],
            ["Retención", profile.planTier === "free" ? "15 días" : "Permanente"],
            ["Rol", profile.role === "admin" ? "Administrador" : "Usuario"],
          ].map(([key, value]) => (
            <div key={key} className="grid gap-1 px-5 py-4 sm:grid-cols-[180px_1fr]">
              <span className="text-sm text-slate-500">{key}</span>
              <span className="text-sm text-white">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
