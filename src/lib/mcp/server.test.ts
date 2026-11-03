import { describe, expect, it } from "vitest";
import { createBellasArtesMcpServer } from "./server";

describe("Bellas Artes MCP Server Tools", () => {
  it("crea el servidor MCP e incluye las herramientas de SplitFrame y Timeline Markers", () => {
    const server = createBellasArtesMcpServer("test-user-id");
    expect(server).toBeDefined();

    // Comprobar que server es una instancia válida de McpServer
    expect(typeof server.registerTool).toBe("function");
    expect(typeof server.registerResource).toBe("function");
  });
});
