import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { NextRequest } from "next/server";
import nextConfig from "../../../next.config";
import { updateSession } from "../supabase/middleware";
import {
  getSupabasePublicEnv,
  getSupabaseAdminEnv,
  getR2Env,
  getAudioProviderEnv,
} from "../../lib/env";

const { createServerClient, getUser } = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  getUser: vi.fn(),
}));

const validAnonKey = "a".repeat(48);

vi.mock("@supabase/ssr", () => ({ createServerClient }));

// List of all 65 route paths compiled by Next.js build
export const ALL_65_ROUTES = [
  // 1-18: Public Marketing, Static, Metadata & Auth Entry
  "/",
  "/_not-found",
  "/login",
  "/blog",
  "/blog/director-de-la-idea-al-storyboard",
  "/blog/consistencia-visual-con-brand-kits",
  "/blog/publicar-en-inspire",
  "/inspire",
  "/mcp",
  "/privacy",
  "/terms",
  "/tutorials",
  "/tutorials/crear-primera-imagen",
  "/tutorials/video-desde-imagen",
  "/tutorials/editar-storyboard",
  "/tutorials/preparar-brand-kit",
  "/robots.txt",
  "/sitemap.xml",

  // 19-48: Protected Application Routes across 18 Private Prefixes
  "/admin/community",
  "/admin/payments",
  "/assets",
  "/audio/my",
  "/audio/tts",
  "/audio/voice-changer",
  "/billing",
  "/brand-kits",
  "/brand-kits/demo-kit-123",
  "/characters",
  "/characters/create",
  "/characters-and-worlds",
  "/community/publish",
  "/credits",
  "/dashboard",
  "/director",
  "/director/projects",
  "/image",
  "/media",
  "/settings",
  "/story",
  "/story/community",
  "/story/create",
  "/story/my",
  "/suite/director",
  "/suite/director/projects",
  "/video",
  "/video/gen-tool",
  "/video/audio",
  "/world",

  // 49-65: Server API & Cron Route Handlers
  "/api/admin/community/posts",
  "/api/admin/community/posts/sample-id/moderate",
  "/api/audio/assets/sample-id",
  "/api/audio/mix",
  "/api/audio/projects",
  "/api/audio/tts",
  "/api/audio/uploads",
  "/api/audio/voice-changer",
  "/api/bcv-rate",
  "/api/brand-kits",
  "/api/brand-kits/sample-id",
  "/api/brand-kits/sample-id/assets",
  "/api/brand-kits/sample-id/assets/sample-asset-id",
  "/api/community/posts",
  "/api/community/posts/sample-id",
  "/api/community/posts/sample-id/remix",
  "/api/cron/assets-retention",
] as const;

export const PRIVATE_PREFIXES = [
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
] as const;

export const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/blog",
  "/inspire",
  "/privacy",
  "/terms",
  "/tutorials",
  "/mcp",
] as const;

describe("Dynamic Route Verification & Session Middleware Suite", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  describe("Total 65 Route Integrity Check", () => {
    it("contains exactly 65 distinct route paths in catalog", () => {
      const uniqueRoutes = new Set(ALL_65_ROUTES);
      expect(ALL_65_ROUTES.length).toBe(65);
      expect(uniqueRoutes.size).toBe(65);
    });

    for (const routePath of ALL_65_ROUTES) {
      const isPrivate = PRIVATE_PREFIXES.some((prefix) => routePath.startsWith(prefix));

      if (isPrivate) {
        it(`route [PRIVATE] ${routePath} redirects unauthenticated requests to /login`, async () => {
          vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
          vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", validAnonKey);
          getUser.mockResolvedValue({ data: { user: null } });
          createServerClient.mockReturnValue({ auth: { getUser } });

          const request = new NextRequest(`https://bellasartes-xi.vercel.app${routePath}`);
          const response = await updateSession(request);

          expect(response.status).toBe(307);
          const location = response.headers.get("location");
          expect(location).toBe(`https://bellasartes-xi.vercel.app/login?next=${encodeURIComponent(routePath)}`);
        });
      } else {
        it(`route [PUBLIC/API] ${routePath} allows request through without redirecting to login`, async () => {
          vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
          vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", validAnonKey);
          getUser.mockResolvedValue({ data: { user: null } });
          createServerClient.mockReturnValue({ auth: { getUser } });

          const request = new NextRequest(`https://bellasartes-xi.vercel.app${routePath}`);
          const response = await updateSession(request);

          expect(response.status).toBe(200);
          expect(response.headers.get("location")).toBeNull();
        });
      }
    }
  });

  describe("18 Private Route Prefixes Enforcement", () => {
    const representativePrivateRoutes = [
      { prefix: "/admin", path: "/admin/community" },
      { prefix: "/audio", path: "/audio/tts" },
      { prefix: "/assets", path: "/assets" },
      { prefix: "/billing", path: "/billing" },
      { prefix: "/brand-kits", path: "/brand-kits/demo-kit-123" },
      { prefix: "/characters", path: "/characters/create" },
      { prefix: "/characters-and-worlds", path: "/characters-and-worlds" },
      { prefix: "/community/publish", path: "/community/publish" },
      { prefix: "/credits", path: "/credits" },
      { prefix: "/dashboard", path: "/dashboard" },
      { prefix: "/director", path: "/director/projects" },
      { prefix: "/image", path: "/image" },
      { prefix: "/media", path: "/media" },
      { prefix: "/settings", path: "/settings" },
      { prefix: "/story", path: "/story/create" },
      { prefix: "/suite/director", path: "/suite/director/projects" },
      { prefix: "/video", path: "/video/gen-tool" },
      { prefix: "/world", path: "/world" },
    ];

    it("verifies all 18 private route prefixes are explicitly listed and tested", () => {
      expect(PRIVATE_PREFIXES.length).toBe(18);
      expect(representativePrivateRoutes.length).toBe(18);
    });

    for (const { prefix, path } of representativePrivateRoutes) {
      it(`redirects unauthenticated requests for prefix ${prefix} (${path}) to /login when missing Supabase config`, async () => {
        vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
        vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");

        const request = new NextRequest(`https://bellasartes-xi.vercel.app${path}`);
        const response = await updateSession(request);

        expect(response.status).toBe(307);
        const location = response.headers.get("location");
        expect(location).not.toBeNull();
        expect(location).toContain("/login");
        expect(location).toContain("config=missing");
        expect(location).toContain(`next=${encodeURIComponent(path)}`);
      });

      it(`redirects unauthenticated requests for prefix ${prefix} (${path}) to /login when user is null`, async () => {
        vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
        vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", validAnonKey);

        getUser.mockResolvedValue({ data: { user: null } });
        createServerClient.mockReturnValue({ auth: { getUser } });

        const request = new NextRequest(`https://bellasartes-xi.vercel.app${path}`);
        const response = await updateSession(request);

        expect(response.status).toBe(307);
        const location = response.headers.get("location");
        expect(location).not.toBeNull();
        expect(location).toBe(`https://bellasartes-xi.vercel.app/login?next=${encodeURIComponent(path)}`);
      });
    }
  });

  describe("Public Routes Unrestricted Access", () => {
    const publicPathsToTest = [
      "/",
      "/login",
      "/blog",
      "/blog/director-de-la-idea-al-storyboard",
      "/inspire",
      "/mcp",
      "/privacy",
      "/terms",
      "/tutorials",
      "/tutorials/crear-primera-imagen",
      "/robots.txt",
      "/sitemap.xml",
    ];

    for (const path of publicPathsToTest) {
      it(`allows public route ${path} without auth error or redirect`, async () => {
        vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
        vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");

        const request = new NextRequest(`https://bellasartes-xi.vercel.app${path}`);
        const response = await updateSession(request);

        expect(response.status).toBe(200);
        expect(response.headers.get("x-middleware-next")).toBe("1");
        expect(createServerClient).not.toHaveBeenCalled();
      });
    }
  });

  describe("Next.config.ts Redirects Evaluation", () => {
    it("evaluates configured redirects correctly", async () => {
      const redirects = await nextConfig.redirects?.();
      expect(redirects).toBeDefined();
      expect(Array.isArray(redirects)).toBe(true);

      const expectedRedirects = [
        { source: "/suite/inspire/feed", destination: "/inspire", permanent: false },
        { source: "/brand-kit", destination: "/brand-kits", permanent: false },
        { source: "/suite/brand-kit", destination: "/brand-kits", permanent: false },
      ];

      for (const expected of expectedRedirects) {
        const found = redirects?.find((r) => r.source === expected.source);
        expect(found).toBeDefined();
        expect(found?.destination).toBe(expected.destination);
        expect(found?.permanent).toBe(expected.permanent);
      }
    });

    it("evaluates clean destination mapping for incoming legacy redirect paths", async () => {
      const redirects = (await nextConfig.redirects?.()) || [];
      const resolveRedirect = (path: string) => {
        const match = redirects.find((r) => r.source === path);
        return match ? match.destination : path;
      };

      expect(resolveRedirect("/suite/inspire/feed")).toBe("/inspire");
      expect(resolveRedirect("/brand-kit")).toBe("/brand-kits");
      expect(resolveRedirect("/suite/brand-kit")).toBe("/brand-kits");
      expect(resolveRedirect("/dashboard")).toBe("/dashboard");
    });
  });

  describe("Environment Variable Verification Logic", () => {
    it("validates getSupabasePublicEnv with proper URL and 40+ char anon key", () => {
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://xyz.supabase.co");
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", validAnonKey);

      const env = getSupabasePublicEnv();
      expect(env.url).toBe("https://xyz.supabase.co");
      expect(env.anonKey).toBe(validAnonKey);
    });

    it("throws clear errors on missing or invalid public Supabase env vars", () => {
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", validAnonKey);
      expect(() => getSupabasePublicEnv()).toThrow("Falta la variable de entorno obligatoria: NEXT_PUBLIC_SUPABASE_URL");

      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://not-https.com");
      expect(() => getSupabasePublicEnv()).toThrow("NEXT_PUBLIC_SUPABASE_URL debe ser una URL HTTPS válida.");

      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://xyz.supabase.co");
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "short-key");
      expect(() => getSupabasePublicEnv()).toThrow("NEXT_PUBLIC_SUPABASE_ANON_KEY no parece una clave pública válida.");
    });

    it("validates getSupabaseAdminEnv and getR2Env when fully populated", () => {
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://xyz.supabase.co");
      vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-key-123");

      const adminEnv = getSupabaseAdminEnv();
      expect(adminEnv.url).toBe("https://xyz.supabase.co");
      expect(adminEnv.serviceRoleKey).toBe("service-key-123");

      vi.stubEnv("CLOUDFLARE_R2_ACCOUNT_ID", "acc123");
      vi.stubEnv("CLOUDFLARE_R2_ACCESS_KEY_ID", "key123");
      vi.stubEnv("CLOUDFLARE_R2_SECRET_ACCESS_KEY", "secret123");
      vi.stubEnv("CLOUDFLARE_R2_BUCKET", "bucket123");

      const r2Env = getR2Env();
      expect(r2Env.accountId).toBe("acc123");
      expect(r2Env.bucket).toBe("bucket123");
    });

    it("returns audio provider defaults when unspecified", () => {
      vi.stubEnv("AUDIO_PROVIDER", "");
      const audioEnv = getAudioProviderEnv();
      expect(audioEnv.provider).toBe("disabled");
      expect(audioEnv.apiKeyConfigured).toBe(false);
    });
  });
});
