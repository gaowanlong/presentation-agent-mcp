import { ExecutionStep, ExecutionGraph, GraphEdge } from "../types/execution-graph.js";

export class ExecutionGraphRuntime {
  nodes: ExecutionStep[] = [];
  edges: GraphEdge[] = [];

  constructor(plan?: { steps: ExecutionStep[] }) {
    if (plan) for (const s of plan.steps) this.nodes.push({ ...s, depends_on: s.depends_on, retry_policy: s.retry_policy });
  }

  addNode(step: ExecutionStep) { this.nodes.push(step); }
  removeNode(id: string) { this.nodes = this.nodes.filter(n => n.id !== id); this.edges = this.edges.filter(e => e.from !== id && e.to !== id); }
  replaceNode(id: string, step: ExecutionStep) { const i = this.nodes.findIndex(n => n.id === id); if (i >= 0) this.nodes[i] = step; }
  addEdge(from: string, to: string, type: "depends_on" | "flow" = "depends_on") { this.edges.push({ from, to, type }); }
  getNode(id: string): ExecutionStep | undefined { return this.nodes.find(n => n.id === id); }
  getReadyNodes(completed: Set<string>): ExecutionStep[] {
    return this.nodes.filter(n => !completed.has(n.id) && (!n.depends_on || n.depends_on.every(d => completed.has(d))));
  }
  hasPending(completed: Set<string>): boolean { return this.nodes.some(n => !completed.has(n.id)); }
  toGraph(): ExecutionGraph { return { nodes: [...this.nodes], edges: [...this.edges] }; }
  topologicalView(): ExecutionStep[] { return [...this.nodes]; }
  clone(): ExecutionGraphRuntime { const c = new ExecutionGraphRuntime(); c.nodes = this.nodes.map(n => ({ ...n })); c.edges = [...this.edges]; return c; }
}

