import { VisualSpec, VisualNode, VisualEdge, DiagramType, LayoutHint, NodeType, EdgeRelation } from "./visual-spec.js";

export class VisualPlanner {
  planFromArchitecture(description: string): VisualSpec {
    const nodes: VisualNode[] = [];
    const edges: VisualEdge[] = [];
    const idMap = new Map<string, string>();
    let nextId = 1;

    const addNode = (label: string, type: NodeType): string => {
      const key = label.toLowerCase().replace(/\s+/g, "_");
      if (idMap.has(key)) return idMap.get(key)!;
      const id = "n" + nextId++;
      idMap.set(key, id);
      nodes.push({ id, label, type });
      return id;
    };

    const addEdge = (fromLabel: string, toLabel: string, relation: EdgeRelation) => {
      const from = addNode(fromLabel, "component");
      const to = addNode(toLabel, "component");
      if (!edges.some(e => e.from === from && e.to === to)) edges.push({ from, to, relation });
    };

    // Parse common patterns
    const lines = description.split(/[。\n;]/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      // "X handles/manages/processes Y" → edge X -> Y
      const mgmt = trimmed.match(/(\S+)\s+(?:handles|manages|processes|controls|runs)\s+(.+)/);
      if (mgmt) { addEdge(mgmt[1], mgmt[2], "controls"); continue; }
      // "X calls/invokes/uses Y" → edge X -> Y
      const call = trimmed.match(/(\S+)\s+(?:calls|invokes|uses|delegates to)\s+(.+)/);
      if (call) { addEdge(call[1], call[2], "calls"); continue; }
      // "X depends on Y" → edge X -> Y
      const dep = trimmed.match(/(\S+)\s+(?:depends on|relies on)\s+(.+)/);
      if (dep) { addEdge(dep[1], dep[2], "depends_on"); continue; }
      // "X flows to Y" → edge X -> Y
      const flow = trimmed.match(/(\S+)\s+(?:flows to|sends to|routes to)\s+(.+)/);
      if (flow) { addEdge(flow[1], flow[2], "flows_to"); continue; }
      // "Layer X: ..." or "X Layer" → node
      const layer = trimmed.match(/(\S+\s*(?:层|Layer|Service|Module|Agent|Runtime|Kernel|Engine))/);
      if (layer) addNode(layer[1], "module");
    }

    // Add standalone nodes for unmatched terms
    for (const term of ["Agent Runtime", "Scheduler", "Memory Manager", "Kernel", "IO Engine", "Security Module"]) {
      if (description.includes(term)) addNode(term, term.includes("Agent") ? "actor" : "module");
    }

    const type: DiagramType = description.length > 200 ? "architecture_diagram" : "flow";
    const layout_hint: LayoutHint = description.includes("层") || description.includes("Layer") ? "layered" : "top-down";
    return { type, nodes, edges, layout_hint };
  }
}

