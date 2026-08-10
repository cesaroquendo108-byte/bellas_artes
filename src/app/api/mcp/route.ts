import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createBellasArtesMcpServer } from "@/lib/mcp/server";
import { getMcpAllowedOrigin, isMcpOriginAllowed, mcpIsConfigured, resolveMcpUser } from "@/lib/mcp/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function corsHeaders() {
  const allowedOrigin = getMcpAllowedOrigin();
  return {
    ...(allowedOrigin ? { "access-control-allow-origin": allowedOrigin, vary: "Origin" } : {}),
    "access-control-allow-headers": "authorization,content-type,accept,mcp-session-id",
    "access-control-allow-methods": "POST,GET,DELETE,OPTIONS",
    "access-control-expose-headers": "Mcp-Session-Id",
  };
}

export async function OPTIONS(request: Request) {
  if (!mcpIsConfigured()) return Response.json({ errorCode: "MCP_NOT_CONFIGURED" }, { status: 503, headers: corsHeaders() });
  if (!isMcpOriginAllowed(request)) return Response.json({ errorCode: "MCP_ORIGIN_FORBIDDEN" }, { status: 403, headers: corsHeaders() });
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export async function POST(request: Request) {
  if (!mcpIsConfigured()) return Response.json({ errorCode: "MCP_NOT_CONFIGURED", message: "El servidor MCP todavía no está configurado." }, { status: 503, headers: corsHeaders() });
  if (!isMcpOriginAllowed(request)) return Response.json({ errorCode: "MCP_ORIGIN_FORBIDDEN", message: "El origen no está autorizado." }, { status: 403, headers: corsHeaders() });
  const userId = resolveMcpUser(request);
  if (!userId) return Response.json({ errorCode: "MCP_UNAUTHORIZED", message: "Falta una API key MCP válida." }, { status: 401, headers: corsHeaders() });
  const server = createBellasArtesMcpServer(userId);
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  await server.connect(transport);
  const response = await transport.handleRequest(request);
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeaders())) headers.set(key, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export async function GET() {
  return Response.json({ errorCode: "MCP_POST_REQUIRED", message: "Usa POST con el transporte MCP Streamable HTTP." }, { status: 405, headers: corsHeaders() });
}

export async function DELETE() {
  return Response.json({ errorCode: "MCP_STATELESS", message: "Este endpoint MCP es stateless." }, { status: 405, headers: corsHeaders() });
}
