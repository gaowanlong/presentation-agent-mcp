import { VisualSpec, VisualNode, VisualEdge } from "./visual-spec.js";

export class GraphSynthesizer {
  synthesizeFromGraph(graph: { nodes?: any[]; edges?: any[] }): VisualSpec {
    const nodes: VisualNode[] = [];
    const edges: VisualEdge[] = [];

    if (graph.nodes) {
      for (const n of graph.nodes) {
        nodes.push({ id: n.id || n.step_id || "unknown", label: n.tool || n.id || "step", type: "component" });
      }
    }
    if (graph.edges) {
      for (const e of graph.edges) {
        edges.push({ from: e.from, to: e.to, relation: "depends_on" });
      }
    }

    // If no explicit edges, infer from depends_on
    if (edges.length === 0 && graph.nodes) {
      for (const n of graph.nodes) {
        if (n.depends_on) {
          for (const dep of n.depends_on) {
            edges.push({ from: dep, to: n.id || n.step_id, relation: "depends_on" });
          }
        }
      }
    }

    return { type: "flow", nodes, edges, layout_hint: "top-down" };
  }
}

