import { VisualSpec, DiagramDSL, RenderNode, RenderEdge, LayoutHint, RenderShape } from "./visual-spec.js";

export class DiagramGenerator {
  generate(spec: VisualSpec): DiagramDSL {
    const nodeW = 1.8, nodeH = 0.5;
    const gapX = 0.5, gapY = 0.4;
    const marginX = 0.5, marginY = 0.3;
    const nodes = spec.nodes;
    const layout = spec.layout_hint;
    const renderNodes: RenderNode[] = [];

    // Assign positions based on layout hint
    if (layout === "layered") {
      const layers = this.groupByLayers(nodes, spec.edges);
      let y = marginY;
      for (const layer of layers) {
        let x = marginX;
        for (const nodeId of layer) {
          const n = nodes.find(n => n.id === nodeId)!;
          const shape: RenderShape = n.type === "data" ? "database" : n.type === "actor" ? "circle" : "roundedBox";
          renderNodes.push({ id: n.id, x, y, w: nodeW, h: nodeH, shape, label: n.label, color: n.type === "actor" ? "#D6E4F0" : "#FFFFFF" });
          x += nodeW + gapX;
        }
        y += nodeH + gapY;
      }
    } else if (layout === "top-down") {
      let x = marginX;
      for (const node of nodes) {
        const shape: RenderShape = node.type === "data" ? "database" : "roundedBox";
        renderNodes.push({ id: node.id, x, y: marginY, w: nodeW, h: nodeH, shape, label: node.label, color: "#FFFFFF" });
        x += nodeW + gapX;
      }
    } else {
      // left-right
      let y = marginY;
      for (const node of nodes) {
        const shape: RenderShape = node.type === "actor" ? "circle" : "roundedBox";
        renderNodes.push({ id: node.id, x: marginX, y, w: nodeW, h: nodeH, shape, label: node.label, color: "#FFFFFF" });
        y += nodeH + gapY;
      }
    }

    // Build render edges
    const renderEdges: RenderEdge[] = spec.edges.map(e => {
      const fromIdx = renderNodes.findIndex(r => r.id === e.from);
      const toIdx = renderNodes.findIndex(r => r.id === e.to);
      return { from: e.from, to: e.to, fromIdx: fromIdx >= 0 ? fromIdx : 0, toIdx: toIdx >= 0 ? toIdx : 0 };
    });

    const maxX = renderNodes.reduce((m, r) => Math.max(m, r.x + r.w), 0) + marginX;
    const maxY = renderNodes.reduce((m, r) => Math.max(m, r.y + r.h), 0) + marginY;
    return { nodes: renderNodes, edges: renderEdges, width: maxX, height: maxY };
  }

  private groupByLayers(nodes: VisualSpec["nodes"], edges: VisualSpec["edges"]): string[][] {
    const layers: string[][] = [];
    const inDegree = new Map<string, number>();
    for (const n of nodes) inDegree.set(n.id, 0);
    for (const e of edges) inDegree.set(e.to, (inDegree.get(e.to) || 0) + 1);

    let current = nodes.filter(n => (inDegree.get(n.id) || 0) === 0).map(n => n.id);
    const visited = new Set<string>();

    while (current.length > 0) {
      layers.push(current);
      for (const id of current) visited.add(id);
      const next: string[] = [];
      for (const id of current) {
        for (const e of edges.filter(e => e.from === id)) {
          if (!visited.has(e.to)) next.push(e.to);
        }
      }
      current = [...new Set(next)];
    }

    // Add unvisited nodes
    const all = nodes.filter(n => !visited.has(n.id)).map(n => n.id);
    if (all.length > 0) layers.push(all);
    return layers;
  }
}

