import { describe, expect, it, vi, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { NextRequest } from "next/server";

const { createServerClient, getUser } = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@supabase/ssr", () => ({ createServerClient }));

import { updateSession } from "./middleware";

import { safeNextPath } from "@/app/login/actions";

const REQUIRED_TABLES = [
  "users",
  "wallets",
  "transactions",
  "pago_movil_proofs",
  "assets",
  "creative_projects",
  "community_posts",
  "brand_kits",
  "brand_kit_assets",
  "audio_voices",
  "audio_jobs",
  "audio_projects",
  "audio_tracks",
];

const PRIVATE_ROUTES = [
  "/admin",
  "/audio",
  "/assets",
  "/billing",
  "/brand-kits",
  "/characters",
  "/characters-and-worlds",
  "/community/publish",
  "/credits",
  "/dashboard",
  "/director",
  "/image",
  "/media",
  "/settings",
  "/story",
  "/suite/director",
  "/video",
  "/world",
];

const MIGRATIONS = [
  "202608080000_base_schema.sql",
  "202608080001_phase1_stabilization.sql",
  "202608080002_story_director_projects.sql",
  "202608080003_social_brand_kits.sql",
  "202608080005_phase5_audio_suite.sql",
];

const allMigrationSql = MIGRATIONS.map((file) =>
  readFileSync(join(process.cwd(), "supabase/migrations", file), "utf8")
).join("\n");

describe("Empirical Challenge: RLS & User Isolation across 13 tables", () => {
  it("enables RLS on all 13 required tables", () => {
    REQUIRED_TABLES.forEach((table) => {
      const rlsRegex = new RegExp(`alter\\s+table\\s+public\\.${table}\\s+enable\\s+row\\s+level\\s+security;`, "i");
      expect(allMigrationSql, `Table ${table} must enable RLS`).toMatch(rlsRegex);
    });
  });

  it("defines restrictive SELECT/ALL policies enforcing user isolation or public filtering on all 13 tables", () => {
    REQUIRED_TABLES.forEach((table) => {
      const selectPolicyRegex = new RegExp(`create\\s+policy\\s+["']?[^"';]+["']?\\s+on\\s+public\\.${table}\\s+for\\s+(select|all)`, "i");
      expect(allMigrationSql, `Table ${table} must have a SELECT or ALL RLS policy`).toMatch(selectPolicyRegex);
    });
  });

  it("validates FOR ALL or FOR SELECT policies on brand_kits and brand_kit_assets", () => {
    const brandKitsPolicyRegex = /create\s+policy\s+["']?brand_kits_owner_all["']?\s+on\s+public\.brand_kits\s+for\s+(select|all)/i;
    const brandKitAssetsPolicyRegex = /create\s+policy\s+["']?brand_kit_assets_owner_all["']?\s+on\s+public\.brand_kit_assets\s+for\s+(select|all)/i;
    expect(allMigrationSql, "brand_kits must have a FOR ALL or FOR SELECT policy").toMatch(brandKitsPolicyRegex);
    expect(allMigrationSql, "brand_kit_assets must have a FOR ALL or FOR SELECT policy").toMatch(brandKitAssetsPolicyRegex);
  });

  it("revokes unauthorized mutation rights (insert, update, delete) from authenticated users on key financial & audio tables", () => {
    const revokedTables = ["wallets", "transactions", "pago_movil_proofs", "assets", "audio_voices", "audio_jobs", "audio_projects", "audio_tracks"];
    revokedTables.forEach((table) => {
      const revokeRegex = new RegExp(`revoke\\s+insert,\\s*update,\\s*delete\\s+on\\s+[^;]*public\\.${table}`, "i");
      expect(allMigrationSql, `Table ${table} must revoke insert/update/delete from authenticated`).toMatch(revokeRegex);
    });
  });
});

describe("Empirical Challenge: 18 Private Route Prefixes Protection", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("blocks unauthenticated access to all 18 private route prefixes when Supabase config is missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");

    for (const route of PRIVATE_ROUTES) {
      const req = new NextRequest(`https://example.test${route}`);
      const res = await updateSession(req);
      expect(res.status, `Route ${route} should redirect when unauthenticated`).toBe(307);
      const location = res.headers.get("location");
      expect(location, `Route ${route} redirect location`).toContain("/login?config=missing");
      expect(location, `Route ${route} should preserve destination`).toContain(`next=${encodeURIComponent(route)}`);
    }
  });

  it("blocks unauthenticated access to all 18 private route prefixes with active Supabase client", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "a".repeat(48));
    getUser.mockResolvedValue({ data: { user: null } });
    createServerClient.mockReturnValue({ auth: { getUser } });

    for (const route of PRIVATE_ROUTES) {
      const req = new NextRequest(`https://example.test${route}`);
      const res = await updateSession(req);
      expect(res.status, `Route ${route} should redirect when user is null`).toBe(307);
      const location = res.headers.get("location");
      expect(location, `Route ${route} redirect location`).toContain("/login?");
      expect(location, `Route ${route} should preserve destination`).toContain(`next=${encodeURIComponent(route)}`);
    }
  });

  it("allows access to public routes (e.g. /blog, /inspire, /privacy, /terms)", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");

    const publicRoutes = ["/blog", "/inspire", "/privacy", "/terms", "/login"];
    for (const route of publicRoutes) {
      const req = new NextRequest(`https://example.test${route}`);
      const res = await updateSession(req);
      expect(res.status, `Public route ${route} should not be blocked`).toBe(200);
    }
  });
});

describe("Empirical Challenge: safeNextPath & Open Redirect Vulnerability Prevention", () => {
  it("sanitizes standard external URL and double-slash open redirect payloads to /dashboard", async () => {
    const STANDARD_ATTACK_VECTORS = [
      "//evil.com",
      "//evil.com/phishing",
      "///evil.com",
      "https://evil.com",
      "http://evil.com",
      "javascript:alert(1)",
      "  //evil.com  ",
      "  https://attacker.com  ",
      "a".repeat(501),
    ];

    for (const payload of STANDARD_ATTACK_VECTORS) {
      const sanitized = await safeNextPath(payload);
      expect(sanitized, `Payload "${payload}" must resolve to /dashboard`).toBe("/dashboard");
    }
  });

  it("handles non-string inputs safely", async () => {
    expect(await safeNextPath(null as unknown as FormDataEntryValue)).toBe("/dashboard");
    expect(await safeNextPath(undefined as unknown as FormDataEntryValue)).toBe("/dashboard");
    expect(await safeNextPath(123 as unknown as FormDataEntryValue)).toBe("/dashboard");
    expect(await safeNextPath({} as unknown as FormDataEntryValue)).toBe("/dashboard");
  });

  it("preserves valid relative paths and query parameters", async () => {
    expect(await safeNextPath("/dashboard")).toBe("/dashboard");
    expect(await safeNextPath("/brand-kits?id=123")).toBe("/brand-kits?id=123");
    expect(await safeNextPath(" /story/my ")).toBe("/story/my");
  });

  it("prevents open redirect during authenticated login redirect in middleware", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "a".repeat(48));
    getUser.mockResolvedValue({ data: { user: { id: "user-123" } } });
    createServerClient.mockReturnValue({ auth: { getUser } });

    for (const badDest of ["//evil.com", "https://evil.com", "javascript:alert(1)", "/\\evil.com"]) {
      const req = new NextRequest(`https://example.test/login?next=${encodeURIComponent(badDest)}`);
      const res = await updateSession(req);
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe("https://example.test/dashboard");
    }
  });

  it("blocks backslash edge-case open redirect vectors to /dashboard", async () => {
    const backslashPayloads = ["/\\evil.com", "/\\", "  /\\evil.com  ", "/\\/evil.com"];
    for (const payload of backslashPayloads) {
      const result = await safeNextPath(payload);
      expect(result, `Payload "${payload}" must resolve to /dashboard`).toBe("/dashboard");
    }
  });
});
