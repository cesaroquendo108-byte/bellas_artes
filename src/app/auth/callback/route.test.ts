import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("OAuth callback route", () => {
  it("turns provider errors into a safe login message", async () => {
    const response = await GET(new Request("https://example.test/auth/callback?error=access_denied"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://example.test/login?message=No%20se%20pudo%20completar%20la%20autenticaci%C3%B3n%20con%20Google",
    );
  });

  it("does not attempt a session exchange without an authorization code", async () => {
    const response = await GET(new Request("https://example.test/auth/callback"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://example.test/login?message=No%20se%20proporcion%C3%B3%20c%C3%B3digo%20de%20autorizaci%C3%B3n",
    );
  });
});
