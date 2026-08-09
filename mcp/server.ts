import { createServer } from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createBellasArtesMcpServer } from "../src/lib/mcp/server";
import { mcpIsConfigured, resolveMcpUser } from "../src/lib/mcp/auth";

const port = Number(process.env.MCP_PORT ?? 8787);

const server = createServer(async (request, response) => {
  if (request.url === "/health") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ ok: true, configured: mcpIsConfigured() }));
    return;
  }
  if (request.url !== "/mcp") {
    response.writeHead(404).end();
    return;
  }
  if (request.method !== "POST") {
    response.writeHead(405, { "content-type": "application/json" }).end(JSON.stringify({ errorCode: "MCP_POST_REQUIRED" }));
    return;
  }
  if (!mcpIsConfigured()) {
    response.writeHead(503, { "content-type": "application/json" }).end(JSON.stringify({ errorCode: "MCP_NOT_CONFIGURED" }));
    return;
  }
  const userId = resolveMcpUser(new Request(`http://${request.headers.host ?? "localhost"}${request.url}`, { headers: request.headers as HeadersInit }));
  if (!userId) {
    response.writeHead(401, { "content-type": "application/json" }).end(JSON.stringify({ errorCode: "MCP_UNAUTHORIZED" }));
    return;
  }
  let raw = "";
  request.setEncoding("utf8");
  request.on("data", (chunk) => { raw += chunk; });
  request.on("end", async () => {
    try {
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
      const mcp = createBellasArtesMcpServer(userId);
      await mcp.connect(transport);
      await transport.handleRequest(request, response, raw ? JSON.parse(raw) : undefined);
    } catch (error) {
      if (!response.headersSent) response.writeHead(500, { "content-type": "application/json" });
      if (!response.writableEnded) response.end(JSON.stringify({ errorCode: "MCP_INTERNAL_ERROR", message: error instanceof Error ? error.message : "Error MCP" }));
    }
  });
});

server.listen(port, () => console.log(`Bellas Artes MCP escuchando en http://localhost:${port}/mcp`));
