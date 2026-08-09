import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { createServerClient, getUser } = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({ createServerClient }));

import { NextRequest } from "next/server";
import nextConfig from "../../../next.config";
import { updateSession } from "../supabase/middleware";
import {
  getSupabasePublicEnv,
  getSupabaseAdminEnv,
  getR2Env,
  getAudioProviderEnv,
} from "../../lib/env";

const validAnonKey = "a".repeat(48);

describe("Challenger M4 Routing Verification & Stress Suite", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", validAnonKey);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  describe("1. Query Parameters & Encoding Preservation", () => {
    it("preserves query params when redirecting unauthenticated users on private routes", async () => {
      getUser.mockResolvedValue({ data: { user: null } });
      createServerClient.mockReturnValue({ auth: { getUser } });

      const pathWithParams = "/dashboard?tab=analytics&period=30d&filter=active";
      const request = new NextRequest(`https://bellasartes-xi.vercel.app${pathWithParams}`);
      const response = await updateSession(request);

      expect(response.status).toBe(307);
      const location = response.headers.get("location");
      expect(location).toBe(`https://bellasartes-xi.vercel.app/login?next=${encodeURIComponent(pathWithParams)}`);
    });

    it("allows query params on public routes without auth check or redirection", async () => {
      getUser.mockResolvedValue({ data: { user: null } });
      createServerClient.mockReturnValue({ auth: { getUser } });

      const request = new NextRequest("https://bellasartes-xi.vercel.app/blog/director-de-la-idea-al-storyboard?utm_source=twitter&ref=social");
      const response = await updateSession(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
    });

    it("preserves complex search params when missing config redirect occurs", async () => {
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");

      const pathWithParams = "/settings?section=profile&page=2";
      const request = new NextRequest(`https://bellasartes-xi.vercel.app${pathWithParams}`);
      const response = await updateSession(request);

      expect(response.status).toBe(307);
      const location = response.headers.get("location");
      expect(location).toBe(`https://bellasartes-xi.vercel.app/login?config=missing&next=${encodeURIComponent(pathWithParams)}`);
    });
  });

  describe("2. Prefix Match Boundaries & Edge Case Routes", () => {
    it("treats subpaths of private prefixes as private", async () => {
      getUser.mockResolvedValue({ data: { user: null } });
      createServerClient.mockReturnValue({ auth: { getUser } });

      const privateSubpaths = [
        "/admin/community",
        "/audio/tts",
        "/brand-kits/demo-123",
        "/director/projects",
        "/story/create",
        "/suite/director/projects",
      ];

      for (const path of privateSubpaths) {
        const request = new NextRequest(`https://bellasartes-xi.vercel.app${path}`);
        const response = await updateSession(request);
        expect(response.status).toBe(307);
        expect(response.headers.get("location")).toContain("/login?next=");
      }
    });

    it("evaluates prefix string matching on routes with similar names", async () => {
      getUser.mockResolvedValue({ data: { user: null } });
      createServerClient.mockReturnValue({ auth: { getUser } });

      // Note: prefix matching is based on pathname.startsWith(prefix)
      const testCases = [
        { path: "/administrator", isPrivate: true },
        { path: "/videogame", isPrivate: true },
        { path: "/billing-info", isPrivate: true },
        { path: "/storyboard", isPrivate: true },
      ];

      for (const tc of testCases) {
        const request = new NextRequest(`https://bellasartes-xi.vercel.app${tc.path}`);
        const response = await updateSession(request);

        if (tc.isPrivate) {
          expect(response.status).toBe(307);
          expect(response.headers.get("location")).toContain(`/login?next=${encodeURIComponent(tc.path)}`);
        } else {
          expect(response.status).toBe(200);
        }
      }
    });
  });

  describe("3. Authenticated User Login Redirects & Open Redirect Protection", () => {
    it("redirects authenticated user to valid relative next path", async () => {
      getUser.mockResolvedValue({ data: { user: { id: "usr_123" } } });
      createServerClient.mockReturnValue({ auth: { getUser } });

      const request = new NextRequest("https://bellasartes-xi.vercel.app/login?next=/director/projects");
      const response = await updateSession(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("https://bellasartes-xi.vercel.app/director/projects");
    });

    it("sanitizes open redirect attempts to external URLs and falls back to /dashboard", async () => {
      getUser.mockResolvedValue({ data: { user: { id: "usr_123" } } });
      createServerClient.mockReturnValue({ auth: { getUser } });

      const maliciousNexts = [
        "https://evil-site.com",
        "http://phishing.org",
        "//evil.com/login",
        "/\\evil.com",
        "/something\\evil",
      ];

      for (const badNext of maliciousNexts) {
        const request = new NextRequest(`https://bellasartes-xi.vercel.app/login?next=${encodeURIComponent(badNext)}`);
        const response = await updateSession(request);

        expect(response.status).toBe(307);
        expect(response.headers.get("location")).toBe("https://bellasartes-xi.vercel.app/dashboard");
      }
    });
  });

  describe("4. Missing or Invalid Supabase Environment Variables", () => {
    it("redirects private route requests to /login?config=missing when Supabase URL is empty", async () => {
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", validAnonKey);

      const request = new NextRequest("https://bellasartes-xi.vercel.app/dashboard");
      const response = await updateSession(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("https://bellasartes-xi.vercel.app/login?config=missing&next=%2Fdashboard");
    });

    it("redirects private route requests to /login?config=missing when Supabase key is less than 40 chars", async () => {
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "short_key");

      const request = new NextRequest("https://bellasartes-xi.vercel.app/billing");
      const response = await updateSession(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("https://bellasartes-xi.vercel.app/login?config=missing&next=%2Fbilling");
    });

    it("allows public route requests even when Supabase environment variables are missing", async () => {
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");

      const publicPaths = ["/", "/login", "/blog", "/inspire", "/privacy", "/terms", "/tutorials", "/mcp"];

      for (const path of publicPaths) {
        const request = new NextRequest(`https://bellasartes-xi.vercel.app${path}`);
        const response = await updateSession(request);

        expect(response.status).toBe(200);
        expect(response.headers.get("location")).toBeNull();
      }
    });
  });

  describe("5. Next.config.ts Redirect Rules Verification", () => {
    it("verifies next.config.ts contains legacy route redirects", async () => {
      const redirects = await nextConfig.redirects?.();
      expect(redirects).toBeDefined();
      expect(Array.isArray(redirects)).toBe(true);

      const legacyMappings = [
        { source: "/suite/inspire/feed", destination: "/inspire" },
        { source: "/brand-kit", destination: "/brand-kits" },
        { source: "/suite/brand-kit", destination: "/brand-kits" },
      ];

      for (const mapping of legacyMappings) {
        const found = redirects?.find((r) => r.source === mapping.source);
        expect(found).toBeDefined();
        expect(found?.destination).toBe(mapping.destination);
        expect(found?.permanent).toBe(false);
      }
    });
  });
});
