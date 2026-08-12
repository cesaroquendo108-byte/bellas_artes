import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/utils/supabase/admin", () => ({ createAdminClient: () => ({ rpc: mocks.rpc }) }));

import { listAdminUsers, sanitizeAdminAuditMetadata } from "./users";

describe("admin users data", () => {
  beforeEach(() => vi.clearAllMocks());

  it("pagina y sanitiza usuarios sin exponer créditos o payloads", async () => {
    mocks.rpc.mockResolvedValue({
      data: {
        total: 1,
        users: [{
          id: "11111111-1111-4111-8111-111111111111",
          email: "persona@example.com",
          display_name: "Persona",
          role: "user",
          plan_tier: "free",
          created_at: "2026-08-12T12:00:00Z",
          access_level: "beta",
          allowed_kinds: ["image"],
          grant_enabled: true,
          grant_active: true,
          expires_at: null,
          credits: 999,
          request: { prompt: "privado" },
        }],
      },
      error: null,
    });
    const result = await listAdminUsers({ search: "persona", role: "all", plan: "all", access: "all", page: 2, pageSize: 20 });
    expect(mocks.rpc).toHaveBeenCalledWith("search_admin_users", expect.objectContaining({ p_offset: 20, p_limit: 20 }));
    expect(result.users[0]).toEqual(expect.objectContaining({ email: "persona@example.com", grant: expect.objectContaining({ active: true }) }));
    expect(result.users[0]).not.toHaveProperty("credits");
    expect(result.users[0]).not.toHaveProperty("request");
  });

  it("limita metadata de auditoría a campos administrativos seguros", () => {
    expect(sanitizeAdminAuditMetadata({ role: "admin", reason: "Operación", token: "secreto", prompt: "privado" }))
      .toEqual({ role: "admin", reason: "Operación" });
  });
});
