import { timingSafeEqual } from "node:crypto";

function sameSecret(left: string, right: string) {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}

export function resolveMcpUser(request: Request) {
  const configuredKey = process.env.MCP_API_KEY?.trim();
  const configuredUserId = process.env.MCP_USER_ID?.trim();
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!configuredKey || !configuredUserId || !token || !sameSecret(token, configuredKey)) return null;
  return configuredUserId;
}

export function mcpIsConfigured() {
  const userId = process.env.MCP_USER_ID?.trim() ?? "";
  const key = process.env.MCP_API_KEY?.trim() ?? "";
  return key.length >= 32
    && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)
    && Boolean(getMcpAllowedOrigin());
}

export function getMcpAllowedOrigin() {
  const configured = process.env.MCP_ALLOWED_ORIGIN?.trim();
  if (!configured || configured === "*") return null;
  try {
    const url = new URL(configured);
    if (url.protocol !== "https:" && !(process.env.NODE_ENV === "test" && url.hostname === "localhost")) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function isMcpOriginAllowed(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const allowed = getMcpAllowedOrigin();
  if (!allowed) return false;
  try {
    return new URL(origin).origin === allowed;
  } catch {
    return false;
  }
}
