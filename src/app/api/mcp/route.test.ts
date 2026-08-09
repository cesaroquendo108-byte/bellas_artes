import { beforeEach, describe, expect, it } from "vitest";
import { POST } from "./route";

const userId = "00000000-0000-4000-8000-000000000012";

describe("MCP HTTP endpoint", () => {
  beforeEach(() => {
    delete process.env.MCP_API_KEY;
    delete process.env.MCP_USER_ID;
  });

  it("permanece explícitamente no configurado sin credenciales de servidor", async () => {
    const response = await POST(new Request("http://localhost/api/mcp", { method: "POST" }));
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ errorCode: "MCP_NOT_CONFIGURED" });
  });

  it("hace handshake MCP con la API key y el usuario de servicio configurados", async () => {
    process.env.MCP_API_KEY = "mcp-secret";
    process.env.MCP_USER_ID = userId;
    const response = await POST(new Request("http://localhost/api/mcp", {
      method: "POST",
      headers: { authorization: "Bearer mcp-secret", accept: "application/json, text/event-stream", "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "vitest", version: "1" } } }),
    }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ result: { serverInfo: { name: "bellas-artes" } } });
  });
});
