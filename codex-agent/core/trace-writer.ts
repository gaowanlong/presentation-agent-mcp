export interface TraceMutation { type: string; step_id?: string; detail: string; }
export interface EnhancedTraceNode { id: string; tool: string; input: any; output: any; state_before: string; state_after: string; status: string; duration_ms: number; graph_mutation?: TraceMutation; }
export interface EnhancedTraceEdge { from: string; to: string; type: string; }
import { TraceNode, TraceEdge, ExecutionTraceGraph } from "../types/trace.js";

export class TraceWriter {
  private nodes: EnhancedTraceNode[] = [];
  private edges: EnhancedTraceEdge[] = [];

  addNode(n: EnhancedTraceNode) { this.nodes.push(n); }
  addEdge(e: EnhancedTraceEdge) { this.edges.push(e); }
  addMutation(index: number, m: TraceMutation) { if (this.nodes[index]) this.nodes[index].graph_mutation = m; }

  getGraph(): ExecutionTraceGraph {
    return { nodes: this.nodes.map(n => ({ id: n.id, tool: n.tool, input: n.input, output: n.output, state: n.state_after, status: n.status, duration_ms: n.duration_ms })), edges: this.edges.map(e => ({ from: e.from, to: e.to, type: e.type as any })) };
  }
  getEnhancedNodes(): EnhancedTraceNode[] { return [...this.nodes]; }
  clear() { this.nodes = []; this.edges = []; }
  toJSON(): string { return JSON.stringify({ nodes: this.nodes, edges: this.edges }, null, 2); }
}

