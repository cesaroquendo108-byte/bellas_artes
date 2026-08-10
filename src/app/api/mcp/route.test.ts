import { beforeEach, describe, expect, it } from "vitest";
import { POST } from "./route";

const userId = "00000000-0000-4000-8000-000000000012";

describe("MCP HTTP endpoint", () => {
  beforeEach(() => {
    delete process.env.MCP_API_KEY;
    delete process.env.MCP_USER_ID;
    delete process.env.MCP_ALLOWED_ORIGIN;
  });

  it("permanece explícitamente no configurado sin credenciales de servidor", async () => {
    const response = await POST(new Request("http://localhost/api/mcp", { method: "POST" }));
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ errorCode: "MCP_NOT_CONFIGURED" });
  });

  it("hace handshake MCP con la API key y el usuario de servicio configurados", async () => {
    process.env.MCP_API_KEY = "mcp-secret-with-at-least-32-characters";
    process.env.MCP_USER_ID = userId;
    process.env.MCP_ALLOWED_ORIGIN = "https://bellasartes-xi.vercel.app";
    const response = await POST(new Request("http://localhost/api/mcp", {
      method: "POST",
      headers: { authorization: "Bearer mcp-secret-with-at-least-32-characters", accept: "application/json, text/event-stream", "content-type": "application/json", origin: "https://bellasartes-xi.vercel.app" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "vitest", version: "1" } } }),
    }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ result: { serverInfo: { name: "bellas-artes" } } });
  });

  it("rechaza API key y Origin inválidos", async () => {
    process.env.MCP_API_KEY = "mcp-secret-with-at-least-32-characters";
    process.env.MCP_USER_ID = userId;
    process.env.MCP_ALLOWED_ORIGIN = "https://bellasartes-xi.vercel.app";
    const body = JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "vitest", version: "1" } } });
    const unauthorized = await POST(new Request("http://localhost/api/mcp", { method: "POST", headers: { authorization: "Bearer wrong", "content-type": "application/json" }, body }));
    expect(unauthorized.status).toBe(401);
    const forbidden = await POST(new Request("http://localhost/api/mcp", { method: "POST", headers: { authorization: "Bearer mcp-secret-with-at-least-32-characters", "content-type": "application/json", origin: "https://evil.example" }, body }));
    expect(forbidden.status).toBe(403);
  });
});
