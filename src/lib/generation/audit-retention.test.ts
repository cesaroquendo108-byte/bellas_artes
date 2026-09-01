import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(join(process.cwd(), "supabase/migrations/202609010002_generation_audit_retention.sql"), "utf8");

describe("moderation audit retention", () => {
  it("expires hashed moderation events and keeps pruning service-only", () => {
    expect(migration).toContain("retention_expires_at");
    expect(migration).toContain("interval '180 days'");
    expect(migration).toContain("prune_generation_moderation_events");
    expect(migration).toContain("revoke all on function public.prune_generation_moderation_events(integer)");
    expect(migration).toContain("to service_role");
  });
});
