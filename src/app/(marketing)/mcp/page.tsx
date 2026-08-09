import type { Metadata } from "next"
import { McpLanding } from "@/components/mcp"
export const metadata: Metadata = { title: "MCP Integrations · Bellas Artes", description: "Guía para conectar Bellas Artes con clientes compatibles con MCP.", alternates: { canonical: "/mcp" } }

function configuredServerUrl() {
  const value = process.env.NEXT_PUBLIC_MCP_SERVER_URL?.trim()
  if (!value) return null
  try {
    const parsed = new URL(value)
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : null
  } catch {
    return null
  }
}

export default function McpPage() { return <McpLanding serverUrl={configuredServerUrl()} /> }
