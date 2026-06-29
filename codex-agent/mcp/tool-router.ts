import type { MCPClient } from "./mcp-client.js";
export function routeTool(client: MCPClient, tool: string, input: any): Promise<any> {
  return client.call(tool, input);
}
