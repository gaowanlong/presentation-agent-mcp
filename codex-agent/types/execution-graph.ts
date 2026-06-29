import { ExecutionStep } from "./execution-plan.js";
export type GraphEdge = { from: string; to: string; type: "depends_on" | "flow" };
export type ExecutionGraph = { nodes: ExecutionStep[]; edges: GraphEdge[] };
