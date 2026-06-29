import { ExecutionStep, ExecutionGraph, GraphEdge } from "../types/execution-graph.js";

export interface SemanticNode extends ExecutionStep {
  intent: string;
  semantic_goal: string;
  confidence: number;
}

export class ExecutionGraphRuntime {
  nodes: SemanticNode[] = [];
  edges: GraphEdge[] = [];

  constructor(plan?: { steps: ExecutionStep[] }) { if (plan) for (const s of plan.steps) this.nodes.push({ ...s, intent: s.tool === "review_deck" ? "evaluate_quality" : "execute_tool", semantic_goal: s.tool, confidence: 1.0 }); }

  addNode(step: ExecutionStep) { this.nodes.push({ ...step, intent: "execute_tool", semantic_goal: step.tool, confidence: 1.0 }); }
  addNodeWithIntent(step: ExecutionStep, intent: string, goal: string, confidence: number = 1.0) { this.nodes.push({ ...step, intent, semantic_goal: goal, confidence }); }
  removeNode(id: string) { this.nodes = this.nodes.filter(n => n.id !== id); this.edges = this.edges.filter(e => e.from !== id && e.to !== id); }
  replaceNode(id: string, step: ExecutionStep) { const i = this.nodes.findIndex(n => n.id === id); if (i >= 0) this.nodes[i] = { ...step, intent: this.nodes[i].intent, semantic_goal: this.nodes[i].semantic_goal, confidence: this.nodes[i].confidence }; }
  addEdge(from: string, to: string, type: "depends_on" | "flow" = "depends_on") { this.edges.push({ from, to, type }); }
  getNode(id: string) { return this.nodes.find(n => n.id === id); }
  getReadyNodes(completed: Set<string>) { return this.nodes.filter(n => !completed.has(n.id) && (!n.depends_on || n.depends_on.every(d => completed.has(d)))); }
  hasPending(completed: Set<string>) { return this.nodes.some(n => !completed.has(n.id)); }
  toGraph(): ExecutionGraph { return { nodes: [...this.nodes], edges: [...this.edges] }; }

  findByIntent(intent: string): SemanticNode[] { return this.nodes.filter(n => n.intent === intent); }
  mutateByIntent(intent: string, updater: (node: SemanticNode) => SemanticNode) { this.nodes = this.nodes.map(n => n.intent === intent ? updater(n) : n); }
  scoreNode(id: string): number { const n = this.getNode(id); return n ? n.confidence : 0; }

  insertNodeAfter(afterId: string, step: ExecutionStep) {
    const idx = this.nodes.findIndex(n => n.id === afterId);
    if (idx >= 0) { const sn: SemanticNode = { ...step, intent: "execute_tool", semantic_goal: step.tool, confidence: 1.0 }; this.nodes.splice(idx + 1, 0, sn); this.edges.push({ from: afterId, to: step.id, type: "depends_on" }); }
  }
  injectFixStep(step: ExecutionStep, afterId?: string) {
    const targetId = afterId || (this.nodes.length > 0 ? this.nodes[this.nodes.length - 1].id : undefined);
    if (targetId) this.insertNodeAfter(targetId, step); else this.addNode(step);
  }
  clone(): ExecutionGraphRuntime { const c = new ExecutionGraphRuntime(); c.nodes = this.nodes.map(n => ({ ...n })); c.edges = [...this.edges]; return c; }
}

