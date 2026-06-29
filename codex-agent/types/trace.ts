export type TraceNode = {
  id: string; tool: string; input: any; output: any;
  state: string; status: string; duration_ms: number;
};
export type TraceEdge = { from: string; to: string; type: "depends_on" | "flow" };
export type ExecutionTraceGraph = { nodes: TraceNode[]; edges: TraceEdge[]; };
export type ExecutionTrace = TraceNode;
