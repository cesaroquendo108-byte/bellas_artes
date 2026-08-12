import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../../../supabase/migrations/20260812120000_admin_dashboard_v1.sql", import.meta.url),
  "utf8",
);

describe("admin dashboard migration", () => {
  it("crea controles, heartbeats y auditoría aditivos", () => {
    expect(migration).toContain("add column if not exists email");
    expect(migration).toContain("from auth.users a");
    expect(migration).toContain("create table if not exists public.platform_runtime_controls");
    expect(migration).toContain("create table if not exists public.service_heartbeats");
    expect(migration).toContain("create table if not exists public.admin_audit_events");
    expect(migration).toContain("values ('generation', false)");
  });

  it("mantiene las estructuras privadas y las mutaciones bajo service_role", () => {
    expect(migration).toContain("enable row level security");
    expect(migration).toContain("revoke all on public.platform_runtime_controls from public, anon, authenticated");
    expect(migration).toContain("grant execute on function public.pause_generation_runtime(uuid,text) to service_role");
    expect(migration).toContain("El registro administrativo es inmutable");
  });

  it("valida el actor administrador dentro de la operación de pausa", () => {
    expect(migration).toContain("select role into v_role from public.users where id = p_actor");
    expect(migration).toContain("v_role is distinct from 'admin'");
    expect(migration).toContain("'generation.emergency_paused'");
  });
});
