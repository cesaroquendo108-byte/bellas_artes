import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(new URL("../../../supabase/migrations/202608080006_generation_orchestration.sql", import.meta.url), "utf8");
const vastOnlyMigration = readFileSync(new URL("../../../supabase/migrations/202608080008_vast_only_generation.sql", import.meta.url), "utf8");
const telemetryMigration = readFileSync(new URL("../../../supabase/migrations/202608080009_generation_telemetry.sql", import.meta.url), "utf8");
const billingShadowMigration = readFileSync(new URL("../../../supabase/migrations/202608100010_generation_billing_shadow.sql", import.meta.url), "utf8");
const rolloutAccessMigration = readFileSync(new URL("../../../supabase/migrations/20260810075311_generation_rollout_access.sql", import.meta.url), "utf8");

describe("generation orchestration migration", () => {
  it("crea jobs, auditoría y relaciones de assets", () => {
    expect(migration).toContain("create table if not exists public.generation_jobs");
    expect(migration).toContain("create table if not exists public.generation_job_attempts");
    expect(migration).toContain("create table if not exists public.generation_job_assets");
  });

  it("expone únicamente RPCs de service role para créditos", () => {
    expect(migration).toContain("reserve_generation_credits");
    expect(migration).toContain("refund_generation_credits");
    expect(migration).toContain("revoke all on function public.reserve_generation_credits");
    expect(migration).toContain("grant execute on function public.reserve_generation_credits");
  });

  it("bloquea nuevas rutas RunPod sin alterar el historial", () => {
    expect(vastOnlyMigration).toContain("enforce_vast_only_generation_provider");
    expect(vastOnlyMigration).toContain("new.provider_route not in ('vast', 'fake')");
    expect(vastOnlyMigration).not.toContain("delete from public.generation_jobs");
  });

  it("registra tiempos y coste estimado sin almacenar prompts", () => {
    expect(telemetryMigration).toContain("record_generation_metrics");
    expect(telemetryMigration).toContain("startup_ms");
    expect(telemetryMigration).toContain("inference_ms");
    expect(telemetryMigration).toContain("estimated_cost_usd");
    expect(telemetryMigration).not.toContain("prompt_hash");
  });

  it("añade billing shadow y coste real sin modificar migraciones históricas", () => {
    expect(billingShadowMigration).toContain("billing_mode");
    expect(billingShadowMigration).toContain("quoted_credits");
    expect(billingShadowMigration).toContain("record_generation_actual_cost");
    expect(billingShadowMigration).toContain("grant execute on function public.record_generation_actual_cost");
    expect(billingShadowMigration).not.toContain("drop table");
  });

  it("mantiene allowlist y entitlements fuera del acceso del cliente", () => {
    expect(rolloutAccessMigration).toContain("generation_access_grants");
    expect(rolloutAccessMigration).toContain("access_level in ('beta', 'pro', 'b2b', 'service')");
    expect(rolloutAccessMigration).toContain("revoke all on public.generation_access_grants from anon, authenticated");
    expect(rolloutAccessMigration).not.toContain("drop table");
  });
});
