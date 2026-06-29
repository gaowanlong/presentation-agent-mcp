import fs from "node:fs";
import type { MCPClient } from "../mcp/mcp-client.js";
import type { ExecutionTraceGraph } from "../types/trace.js";

export class ReplayEngine {
  async replay(tracePath: string, client: MCPClient): Promise<ExecutionTraceGraph> {
    const raw = fs.readFileSync(tracePath, "utf-8");
    const graph: ExecutionTraceGraph = JSON.parse(raw);
    const reexecuted: ExecutionTraceGraph = { nodes: [], edges: graph.edges };
    for (const node of graph.nodes) {
      const start = Date.now();
      try {
        const output = await client.call(node.tool, node.input);
        reexecuted.nodes.push({ ...node, output, status: "success", duration_ms: Date.now() - start });
      } catch (e: any) {
        reexecuted.nodes.push({ ...node, output: { error: e.message }, status: "failed", duration_ms: Date.now() - start });
      }
    }
    return reexecuted;
  }
}

