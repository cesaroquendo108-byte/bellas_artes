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

  it("publica sólo tools respaldadas por workflows API reales", async () => {
    process.env.MCP_API_KEY = "mcp-secret-with-at-least-32-characters";
    process.env.MCP_USER_ID = userId;
    process.env.MCP_ALLOWED_ORIGIN = "https://bellasartes-xi.vercel.app";
    const response = await POST(new Request("http://localhost/api/mcp", {
      method: "POST",
      headers: { authorization: "Bearer mcp-secret-with-at-least-32-characters", accept: "application/json, text/event-stream", "content-type": "application/json", origin: "https://bellasartes-xi.vercel.app" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} }),
    }));
    expect(response.status).toBe(200);
    const payload = await response.json() as { result?: { tools?: Array<{ name?: string }> } };
    const names = payload.result?.tools?.map((tool) => tool.name) ?? [];
    expect(names).toContain("create_image");
    expect(names).toContain("create_video");
    expect(names).toContain("list_freefield_apps");
    expect(names).toContain("get_freefield_app");
    expect(names).toContain("build_freefield_workflow");
    expect(names).toContain("audit_comfy_workflow_nodes");
    expect(names).toContain("directors_cut_compose_prompt");
    expect(names).toContain("supercomputer_plan_pipeline");
    expect(names).toContain("goatd_enhance_prompt");
  });

  it("permite invocar supercomputer_plan_pipeline a través de MCP", async () => {
    process.env.MCP_API_KEY = "mcp-secret-with-at-least-32-characters";
    process.env.MCP_USER_ID = userId;
    process.env.MCP_ALLOWED_ORIGIN = "https://bellasartes-xi.vercel.app";

    const response = await POST(new Request("http://localhost/api/mcp", {
      method: "POST",
      headers: {
        authorization: "Bearer mcp-secret-with-at-least-32-characters",
        accept: "application/json, text/event-stream",
        "content-type": "application/json",
        origin: "https://bellasartes-xi.vercel.app",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 5,
        method: "tools/call",
        params: {
          name: "supercomputer_plan_pipeline",
          arguments: {
            projectId: "mcp_test_proj",
            title: "Spot Fiduciario Finve",
            targetDurationSeconds: 15,
            coreMessage: "Educacion bursatil y rigor en la BVC.",
          },
        },
      }),
    }));
    expect(response.status).toBe(200);
    const payload = await response.json() as { result?: { content?: Array<{ text: string }> } };
    expect(payload.result?.content?.[0]?.text).toContain("Spot Fiduciario Finve");
    expect(payload.result?.content?.[0]?.text).toContain("directors-cut");
  });

  it("permite invocar audit_comfy_workflow_nodes a través de MCP", async () => {
    process.env.MCP_API_KEY = "mcp-secret-with-at-least-32-characters";
    process.env.MCP_USER_ID = userId;
    process.env.MCP_ALLOWED_ORIGIN = "https://bellasartes-xi.vercel.app";
    const sampleWorkflow = JSON.stringify({
      "1": { class_type: "LoadImage" },
      "2": { class_type: "SaveVideo" },
    });

    const response = await POST(new Request("http://localhost/api/mcp", {
      method: "POST",
      headers: {
        authorization: "Bearer mcp-secret-with-at-least-32-characters",
        accept: "application/json, text/event-stream",
        "content-type": "application/json",
        origin: "https://bellasartes-xi.vercel.app",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 4,
        method: "tools/call",
        params: {
          name: "audit_comfy_workflow_nodes",
          arguments: { workflowJson: sampleWorkflow },
        },
      }),
    }));
    expect(response.status).toBe(200);
    const payload = await response.json() as { result?: { content?: Array<{ text: string }> } };
    expect(payload.result?.content?.[0]?.text).toContain("HEALTHY");
  });

  it("permite invocar list_freefield_apps a través de MCP", async () => {
    process.env.MCP_API_KEY = "mcp-secret-with-at-least-32-characters";
    process.env.MCP_USER_ID = userId;
    process.env.MCP_ALLOWED_ORIGIN = "https://bellasartes-xi.vercel.app";
    const response = await POST(new Request("http://localhost/api/mcp", {
      method: "POST",
      headers: { authorization: "Bearer mcp-secret-with-at-least-32-characters", accept: "application/json, text/event-stream", "content-type": "application/json", origin: "https://bellasartes-xi.vercel.app" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: { name: "list_freefield_apps", arguments: { query: "recast", limit: 5 } },
      }),
    }));
    expect(response.status).toBe(200);
    const payload = await response.json() as { result?: { content?: Array<{ text: string }> } };
    expect(payload.result?.content?.[0]?.text).toContain("recast");
  });
});
