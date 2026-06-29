import fs from "node:fs";
import type { MCPClient } from "../mcp/mcp-client.js";
import { ExecutionGraphRuntime } from "./execution-graph.js";

export class ReplayEngine {
  reconstructGraph(tracePath: string): ExecutionGraphRuntime {
    const raw = fs.readFileSync(tracePath, "utf-8");
    const data = JSON.parse(raw);
    const graph = new ExecutionGraphRuntime();
    if (data.nodes) for (const n of data.nodes) graph.addNode({ id: n.id, tool: n.tool, input: n.input, depends_on: data.edges?.filter((e: any) => e.to === n.id).map((e: any) => e.from), retry_policy: { max_retry: 1, fallback: "skip" } });
    if (data.edges) for (const e of data.edges) graph.addEdge(e.from, e.to, e.type);
    return graph;
  }

  async replay(graph: ExecutionGraphRuntime, client: MCPClient): Promise<any[]> {
    const results: any[] = [];
    const completed = new Set<string>();
    while (graph.hasPending(completed)) {
      const ready = graph.getReadyNodes(completed);
      for (const step of ready) {
        try {
          const output = await client.call(step.tool, step.input);
          results.push({ id: step.id, tool: step.tool, status: "success", output });
        } catch (e: any) {
          results.push({ id: step.id, tool: step.tool, status: "failed", error: e.message });
        }
        completed.add(step.id);
      }
    }
    return results;
  }

  diff(original: ExecutionGraphRuntime, replay: ExecutionGraphRuntime): any[] {
    return original.nodes.map(on => {
      const rn = replay.getNode(on.id);
      return { id: on.id, original_tool: on.tool, replay_tool: rn?.tool, matched: on.tool === rn?.tool };
    });
  }
}

