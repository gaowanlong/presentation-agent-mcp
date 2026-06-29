import { ExecutionStep, ExecutionGraph, GraphEdge } from "../types/execution-graph.js";

export class ExecutionGraphRuntime {
  nodes: ExecutionStep[] = [];
  edges: GraphEdge[] = [];

  constructor(plan?: { steps: ExecutionStep[] }) { if (plan) for (const s of plan.steps) this.nodes.push({ ...s }); }

  addNode(step: ExecutionStep) { this.nodes.push(step); }
  removeNode(id: string) { this.nodes = this.nodes.filter(n => n.id !== id); this.edges = this.edges.filter(e => e.from !== id && e.to !== id); }
  replaceNode(id: string, step: ExecutionStep) { const i = this.nodes.findIndex(n => n.id === id); if (i >= 0) this.nodes[i] = step; }
  addEdge(from: string, to: string, type: "depends_on" | "flow" = "depends_on") { this.edges.push({ from, to, type }); }
  getNode(id: string) { return this.nodes.find(n => n.id === id); }
  getReadyNodes(completed: Set<string>) { return this.nodes.filter(n => !completed.has(n.id) && (!n.depends_on || n.depends_on.every(d => completed.has(d)))); }
  hasPending(completed: Set<string>) { return this.nodes.some(n => !completed.has(n.id)); }
  toGraph(): ExecutionGraph { return { nodes: [...this.nodes], edges: [...this.edges] }; }

  // V0.8 new methods
  insertNodeAfter(afterId: string, step: ExecutionStep) {
    const idx = this.nodes.findIndex(n => n.id === afterId);
    if (idx >= 0) { this.nodes.splice(idx + 1, 0, step); this.edges.push({ from: afterId, to: step.id, type: "depends_on" }); }
  }
  replaceSubGraph(fromId: string, toId: string, newSteps: ExecutionStep[]) {
    const from = this.nodes.findIndex(n => n.id === fromId);
    const to = this.nodes.findIndex(n => n.id === toId);
    if (from >= 0 && to >= 0) { this.nodes.splice(from, to - from + 1, ...newSteps); }
  }
  injectFixStep(step: ExecutionStep, afterId?: string) {
    const targetId = afterId || (this.nodes.length > 0 ? this.nodes[this.nodes.length - 1].id : undefined);
    if (targetId) this.insertNodeAfter(targetId, step);
    else this.addNode(step);
  }
  forkExecution(nodeId: string, branches: ExecutionStep[][]) {
    this.removeNode(nodeId);
    for (const branch of branches) {
      for (let i = 0; i < branch.length; i++) {
        this.addNode(branch[i]);
        if (i > 0) this.addEdge(branch[i - 1].id, branch[i].id, "depends_on");
      }
    }
  }
  clone(): ExecutionGraphRuntime { const c = new ExecutionGraphRuntime(); c.nodes = this.nodes.map(n => ({ ...n })); c.edges = [...this.edges]; return c; }
}

