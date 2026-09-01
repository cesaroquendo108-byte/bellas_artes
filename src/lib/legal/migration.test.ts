import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(join(process.cwd(), "supabase/migrations/202609010001_legal_consents.sql"), "utf8");

describe("legal consent migration", () => {
  it("stores versioned terms and moderation acceptance privately", () => {
    expect(migration).toContain("create table if not exists public.user_consents");
    expect(migration).toContain("consent_type in ('terms', 'moderation')");
    expect(migration).toContain("primary key (user_id, consent_type, version)");
    expect(migration).toContain("alter table public.user_consents enable row level security");
    expect(migration).toContain("revoke all on public.user_consents from anon, authenticated");
    expect(migration).toContain("grant select, insert, update, delete on public.user_consents to service_role");
  });
});
