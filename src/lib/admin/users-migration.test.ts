import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../../../supabase/migrations/20260812170000_admin_users_access.sql", import.meta.url),
  "utf8",
);

describe("admin users and access migration", () => {
  it("mantiene consultas y mutaciones bajo service_role", () => {
    expect(migration).toContain("create or replace function public.search_admin_users");
    expect(migration).toContain("create or replace function public.set_generation_access_grant");
    expect(migration).toContain("create or replace function public.set_admin_user_role");
    expect(migration).toContain("revoke all on function public.search_admin_users");
    expect(migration).toContain("to service_role");
  });

  it("audita grants y roles sin tocar créditos ni pagos", () => {
    expect(migration).toContain("insert into public.admin_audit_events");
    expect(migration).toContain("'user.access_updated'");
    expect(migration).toContain("'user.role_changed'");
    expect(migration).not.toMatch(/update public\.users set credits/i);
    expect(migration).not.toMatch(/pago_movil_proofs/i);
  });

  it("protege al último administrador y valida modalidades", () => {
    expect(migration).toContain("No se puede retirar el ultimo administrador");
    expect(migration).toContain("array['image','video','audio','character','world']");
    expect(migration).toContain("p_confirmation is distinct from 'CAMBIAR ROL'");
  });
});
