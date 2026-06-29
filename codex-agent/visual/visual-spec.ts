export type DiagramType = "architecture_diagram" | "flow" | "timeline" | "layered_system";
export type NodeType = "component" | "module" | "service" | "data" | "actor";
export type EdgeRelation = "calls" | "flows_to" | "depends_on" | "controls";
export type LayoutHint = "left-right" | "top-down" | "layered";
export type RenderShape = "box" | "circle" | "database" | "roundedBox";

export interface VisualNode { id: string; label: string; type: NodeType; description?: string; }
export interface VisualEdge { from: string; to: string; relation: EdgeRelation; }
export interface VisualSpec { type: DiagramType; nodes: VisualNode[]; edges: VisualEdge[]; layout_hint: LayoutHint; style?: Record<string, string>; }
export interface RenderNode { id: string; x: number; y: number; w: number; h: number; shape: RenderShape; label: string; color?: string; }
export interface RenderEdge { from: string; to: string; fromIdx: number; toIdx: number; label?: string; }
export interface DiagramDSL { nodes: RenderNode[]; edges: RenderEdge[]; width: number; height: number; }

export function specNodeCount(spec: VisualSpec): number { return spec.nodes.length; }
export function specEdgeCount(spec: VisualSpec): number { return spec.edges.length; }

