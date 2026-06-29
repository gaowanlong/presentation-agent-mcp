import type { MCPClient } from "./mcp-client.js";
export class MockMCPClient implements MCPClient {
  private handler: any;
  constructor(handler: any) { this.handler = handler; }
  async call(tool: string, input: any): Promise<any> { return this.handler(tool, input); }
}
