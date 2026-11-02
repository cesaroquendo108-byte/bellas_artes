import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createBellasArtesMcpServer } from "../src/lib/mcp/server";

async function main() {
  const userId = process.env.MCP_USER_ID?.trim();
  if (!userId) {
    process.stderr.write("Error: Falta MCP_USER_ID en el entorno.\n");
    process.exit(1);
  }

  const server = createBellasArtesMcpServer(userId);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  process.stderr.write(`Error en Bellas Artes Stdio MCP: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
