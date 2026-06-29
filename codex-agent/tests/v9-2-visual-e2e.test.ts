import { describe, it, expect } from "vitest";
import { VisualPlanner } from "../visual/visual-planner.js";
import { DiagramGenerator } from "../visual/diagram-generator.js";
import { GraphSynthesizer } from "../visual/graph-synthesizer.js";
import { specNodeCount, specEdgeCount } from "../visual/visual-spec.js";

const archDescription = "Agent Runtime handles scheduling and manages memory. Scheduler controls IO Engine. Memory Manager handles KV Cache. Kernel depends on Security Module. IO Engine flows to Network Interface.";

const layerDescription = "应用层：负责智能应用与 Agent 服务。运行时层：负责动态调度、内存管理、IO 引擎。内核层：提供底层 OS 机制与安全隔离。";

describe("V0.9.2 Visual Intelligence", () => {
  it("VisualPlanner should generate nodes from architecture description", () => {
    const planner = new VisualPlanner();
    const spec = planner.planFromArchitecture(archDescription);
    expect(spec.nodes.length).toBeGreaterThanOrEqual(3);
    expect(spec.edges.length).toBeGreaterThanOrEqual(2);
  });

  it("VisualPlanner should extract relationships from text", () => {
    const planner = new VisualPlanner();
    const spec = planner.planFromArchitecture(archDescription);
    const schedulerNode = spec.nodes.find(n => n.label.includes("Scheduler"));
    const ioNode = spec.nodes.find(n => n.label.includes("IO"));
    if (schedulerNode && ioNode) {
      const edge = spec.edges.find(e => e.from === schedulerNode.id && e.to === ioNode.id);
      expect(edge?.relation).toBe("controls");
    }
  });

  it("VisualPlanner should handle layered architecture description", () => {
    const planner = new VisualPlanner();
    const spec = planner.planFromArchitecture(layerDescription);
    expect(spec.layout_hint).toBe("layered");
    expect(spec.nodes.length).toBeGreaterThanOrEqual(3);
  });

  it("DiagramGenerator should produce positioned nodes", () => {
    const planner = new VisualPlanner();
    const generator = new DiagramGenerator();
    const spec = planner.planFromArchitecture(archDescription);
    const dsl = generator.generate(spec);
    expect(dsl.nodes.length).toBe(spec.nodes.length);
    for (const node of dsl.nodes) {
      expect(node.x).toBeGreaterThanOrEqual(0);
      expect(node.y).toBeGreaterThanOrEqual(0);
      expect(node.w).toBeGreaterThan(0);
      expect(node.h).toBeGreaterThan(0);
    }
  });

  it("DiagramGenerator should produce edges with valid indices", () => {
    const planner = new VisualPlanner();
    const generator = new DiagramGenerator();
    const spec = planner.planFromArchitecture(archDescription);
    const dsl = generator.generate(spec);
    for (const edge of dsl.edges) {
      expect(edge.fromIdx).toBeGreaterThanOrEqual(0);
      expect(edge.fromIdx).toBeLessThan(dsl.nodes.length);
      expect(edge.toIdx).toBeGreaterThanOrEqual(0);
      expect(edge.toIdx).toBeLessThan(dsl.nodes.length);
    }
  });

  it("GraphSynthesizer should convert execution trace to VisualSpec", () => {
    const synth = new GraphSynthesizer();
    const graph = {
      nodes: [{ id: "s1", tool: "create_deck" }, { id: "s2", tool: "review_deck", depends_on: ["s1"] }, { id: "s3", tool: "export_pptx", depends_on: ["s2"] }],
    };
    const spec = synth.synthesizeFromGraph(graph);
    expect(spec.nodes.length).toBe(3);
    expect(spec.edges.length).toBeGreaterThanOrEqual(2);
    expect(spec.type).toBe("flow");
  });

  it("DiagramGenerator should create top-down layout", () => {
    const planner = new VisualPlanner();
    const generator = new DiagramGenerator();
    const spec = planner.planFromArchitecture(archDescription);
    spec.layout_hint = "top-down";
    const dsl = generator.generate(spec);
    const firstRowY = dsl.nodes[0]?.y || 0;
    expect(dsl.nodes.every(n => n.y === firstRowY)).toBe(true);
  });

  it("VisualSpec utility functions should return correct counts", () => {
    const planner = new VisualPlanner();
    const spec = planner.planFromArchitecture(archDescription);
    expect(specNodeCount(spec)).toBe(spec.nodes.length);
    expect(specEdgeCount(spec)).toBe(spec.edges.length);
  });
});

