import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(new URL("../../../supabase/migrations/202608080006_generation_orchestration.sql", import.meta.url), "utf8");

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
});
