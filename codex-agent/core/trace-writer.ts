import { TraceNode, TraceEdge, ExecutionTraceGraph } from "../types/trace.js";
export class TraceWriter {
  private nodes: TraceNode[] = []; private edges: TraceEdge[] = [];
  addNode(n: TraceNode) { this.nodes.push(n); }
  addEdge(e: TraceEdge) { this.edges.push(e); }
  getGraph(): ExecutionTraceGraph { return { nodes: [...this.nodes], edges: [...this.edges] }; }
  clear() { this.nodes = []; this.edges = []; }
  toJSON(): string { return JSON.stringify(this.getGraph(), null, 2); }
}

