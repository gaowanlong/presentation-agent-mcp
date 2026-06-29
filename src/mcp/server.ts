import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { PresentationRuntime } from "../runtime/presentation-runtime.js";
import { registerToolHandlers } from "./tools.js";

export async function startMcpServer(runtime: PresentationRuntime): Promise<void> {
  const server = new Server(
    {
      name: "presentation-agent-mcp",
      version: "0.1.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  registerToolHandlers(server, runtime);

  server.onerror = (error: Error) => {
    console.error("[MCP Error]", error);
  };

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
