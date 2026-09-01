import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const migrationPath = fileURLToPath(
  new URL("../../../supabase/migrations/202608080005_phase5_audio_suite.sql", import.meta.url),
);
const migration = readFileSync(migrationPath, "utf8");
const atomicSaveMigration = readFileSync(
  fileURLToPath(
    new URL("../../../supabase/migrations/202609010003_audio_projects_atomic_save.sql", import.meta.url),
  ),
  "utf8",
);

describe("Audio migration", () => {
  it.each(["audio_voices", "audio_jobs", "audio_projects", "audio_tracks"])(
    "habilita RLS y una política de lectura segura para %s",
    (table) => {
      expect(migration).toContain(`alter table public.${table} enable row level security`);
      expect(migration).toMatch(new RegExp(`policy [\\s\\S]* on public\\.${table} for select`));
    },
  );

  it("reserva las funciones financieras exclusivamente para service_role", () => {
    expect(migration).toContain("grant execute on function public.reserve_audio_job_credits");
    expect(migration).toContain("to service_role");
    expect(migration).toContain("revoke all on function public.reserve_audio_job_credits");
    expect(migration).toContain("from public, anon, authenticated");
  });

  it("protege idempotencia y propiedad de assets de salida", () => {
    expect(migration).toContain("unique (user_id, idempotency_key)");
    expect(migration).toContain("user_id = v_job.user_id and type = 'audio'");
  });

  it("guarda metadata y pistas en una operación atómica privada", () => {
    expect(atomicSaveMigration).toContain("create or replace function public.save_audio_project");
    expect(atomicSaveMigration).toContain("delete from public.audio_tracks");
    expect(atomicSaveMigration).toContain("from jsonb_array_elements");
    expect(atomicSaveMigration).toContain("revoke all on function public.save_audio_project");
    expect(atomicSaveMigration).toContain("grant execute on function public.save_audio_project");
    expect(atomicSaveMigration).toContain("to service_role");
  });
});
