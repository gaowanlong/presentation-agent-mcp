import { ExecutionStep } from "../types/execution-plan.js";
import { ExecutionGraph } from "../types/execution-graph.js";

export type NodeStatus = "pending" | "running" | "success" | "failed" | "skipped";

export class GraphStateManager {
  private statuses = new Map<string, NodeStatus>();

  init(nodes: ExecutionStep[]) { for (const n of nodes) this.statuses.set(n.id, "pending"); }
  setStatus(id: string, s: NodeStatus) { this.statuses.set(id, s); }
  getStatus(id: string): NodeStatus { return this.statuses.get(id) || "pending"; }
  
  getReadyNodes(graph: ExecutionGraph): ExecutionStep[] {
    return graph.nodes.filter(n => {
      const st = this.getStatus(n.id);
      if (st !== "pending") return false;
      if (!n.depends_on || n.depends_on.length === 0) return true;
      return n.depends_on.every(d => this.getStatus(d) === "success");
    });
  }

  isComplete(): boolean {
    return !Array.from(this.statuses.values()).some(s => s === "pending" || s === "running");
  }

  getSummary() {
    let p = 0, r = 0, suc = 0, f = 0, sk = 0;
    for (const s of this.statuses.values()) { if (s === "pending") p++; else if (s === "running") r++; else if (s === "success") suc++; else if (s === "failed") f++; else sk++; }
    return { pending: p, running: r, success: suc, failed: f, skipped: sk };
  }
}

