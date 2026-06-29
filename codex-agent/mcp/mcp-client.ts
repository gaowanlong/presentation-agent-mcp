export interface MCPClient {
  call(tool: string, input: any): Promise<any>;
}
