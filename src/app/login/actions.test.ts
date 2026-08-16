import { afterEach, describe, expect, it, vi } from "vitest";
import { getOAuthRedirectBaseUrl } from "@/lib/auth-redirect";

describe("getOAuthRedirectBaseUrl", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("uses the canonical production URL when Vercel URL is the only fallback", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("VERCEL_URL", "temporary-deployment.vercel.app");

    expect(getOAuthRedirectBaseUrl()).toBe("https://bellasartes-xi.vercel.app");
  });

  it("prefers the configured site URL and removes trailing slashes", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://bellasartes-xi.vercel.app///");

    expect(getOAuthRedirectBaseUrl()).toBe("https://bellasartes-xi.vercel.app");
  });

  it("uses localhost during local development", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");

    expect(getOAuthRedirectBaseUrl()).toBe("http://localhost:3000");
  });

  it("ignores a localhost site URL in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");

    expect(getOAuthRedirectBaseUrl()).toBe("https://bellasartes-xi.vercel.app");
  });

  it("ignores loopback site URLs in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://127.0.0.1:3000");

    expect(getOAuthRedirectBaseUrl()).toBe("https://bellasartes-xi.vercel.app");
  });

  it("ignores malformed site URLs in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "[SENSITIVE]");

    expect(getOAuthRedirectBaseUrl()).toBe("https://bellasartes-xi.vercel.app");
  });
});
