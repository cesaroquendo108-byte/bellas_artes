import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/20260813150000_vast_admin_gpu_leases.sql"), "utf8");

describe("migración de alquileres Vast", () => {
  it("crea un ledger privado con un único cupo activo", () => {
    expect(migration).toContain("create table if not exists public.vast_admin_leases");
    expect(migration).toContain("vast_admin_leases_single_active_idx");
    expect(migration).toContain("where state not in ('destroyed', 'failed')");
    expect(migration).toContain("alter table public.vast_admin_leases enable row level security");
    expect(migration).toContain("revoke all on public.vast_admin_leases from public, anon, authenticated");
    expect(migration).toContain("grant select, insert, update on public.vast_admin_leases to service_role");
  });

  it("limita precio, gasto máximo y no persiste secretos", () => {
    expect(migration).toContain("hourly_cost_usd > 0 and hourly_cost_usd <= 0.60");
    expect(migration).toContain("estimated_max_cost_usd >= 0 and estimated_max_cost_usd <= 1.20");
    expect(migration).not.toMatch(/api_key|ssh_key|jupyter_token|secret/i);
  });
});
