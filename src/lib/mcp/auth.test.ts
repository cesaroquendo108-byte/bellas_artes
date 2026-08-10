import { beforeEach, describe, expect, it } from "vitest";
import { mcpIsConfigured, resolveMcpUser } from "./auth";

describe("MCP authentication", () => {
  beforeEach(() => {
    delete process.env.MCP_API_KEY;
    delete process.env.MCP_USER_ID;
    delete process.env.MCP_ALLOWED_ORIGIN;
  });

  it("permite únicamente el bearer configurado y devuelve el usuario del servidor", () => {
    process.env.MCP_API_KEY = "mcp-secret-with-at-least-32-characters";
    process.env.MCP_USER_ID = "00000000-0000-4000-8000-000000000012";
    process.env.MCP_ALLOWED_ORIGIN = "https://bellasartes-xi.vercel.app";
    expect(mcpIsConfigured()).toBe(true);
    expect(resolveMcpUser(new Request("http://localhost/api/mcp", { headers: { authorization: "Bearer mcp-secret-with-at-least-32-characters" } }))).toBe(process.env.MCP_USER_ID);
    expect(resolveMcpUser(new Request("http://localhost/api/mcp", { headers: { authorization: "Bearer wrong" } }))).toBeNull();
  });

  it("no acepta userId desde el cliente ni funciona sin configuración", () => {
    expect(mcpIsConfigured()).toBe(false);
    expect(resolveMcpUser(new Request("http://localhost/api/mcp", { headers: { authorization: "Bearer mcp-secret", "x-user-id": "otro" } }))).toBeNull();
  });

  it("falla cerrado con wildcard y compara el Origin exacto", async () => {
    const { getMcpAllowedOrigin, isMcpOriginAllowed } = await import("./auth");
    process.env.MCP_ALLOWED_ORIGIN = "*";
    expect(getMcpAllowedOrigin()).toBeNull();
    process.env.MCP_ALLOWED_ORIGIN = "https://bellasartes-xi.vercel.app/path";
    expect(getMcpAllowedOrigin()).toBe("https://bellasartes-xi.vercel.app");
    expect(isMcpOriginAllowed(new Request("http://localhost", { headers: { origin: "https://bellasartes-xi.vercel.app" } }))).toBe(true);
    expect(isMcpOriginAllowed(new Request("http://localhost", { headers: { origin: "https://evil.example" } }))).toBe(false);
  });
});
