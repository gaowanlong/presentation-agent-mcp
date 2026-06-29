import { describe, it, expect } from "vitest";
import { ExecutionGraphRuntime } from "../core/execution-graph.js";
import { GraphStateManager } from "../core/graph-state-manager.js";
import { Replanner } from "../core/replanner.js";
import { ExecutionPolicy } from "../planning/execution-policy.js";

describe("V0.7.2 Adaptive Execution", () => {
  it("ExecutionGraph should support add/remove/replace nodes", () => {
    const g = new ExecutionGraphRuntime();
    g.addNode({ id: "s1", tool: "create_deck", input: {} });
    g.addNode({ id: "s2", tool: "review_deck", input: {}, depends_on: ["s1"] });
    expect(g.nodes.length).toBe(2);
    g.removeNode("s1");
    expect(g.nodes.length).toBe(1);
    g.replaceNode("s2", { id: "s2", tool: "auto_fix_deck", input: {} });
    expect(g.getNode("s2")?.tool).toBe("auto_fix_deck");
  });

  it("GraphStateManager should track statuses", () => {
    const g = new ExecutionGraphRuntime();
    g.addNode({ id: "s1", tool: "create_deck", input: {} });
    g.addNode({ id: "s2", tool: "review_deck", input: {}, depends_on: ["s1"] });
    const sm = new GraphStateManager();
    sm.init(g.nodes);
    expect(sm.getStatus("s1")).toBe("pending");
    sm.setStatus("s1", "success");
    expect(sm.getStatus("s1")).toBe("success");
  });

  it("GraphStateManager should find ready nodes", () => {
    const g = new ExecutionGraphRuntime();
    g.addNode({ id: "s1", tool: "create_deck", input: {} });
    g.addNode({ id: "s2", tool: "review_deck", input: {}, depends_on: ["s1"] });
    const sm = new GraphStateManager();
    sm.init(g.nodes);
    let ready = sm.getReadyNodes(g.toGraph());
    expect(ready.length).toBe(1);
    expect(ready[0].id).toBe("s1");
    sm.setStatus("s1", "success");
    ready = sm.getReadyNodes(g.toGraph());
    expect(ready.length).toBe(1);
    expect(ready[0].id).toBe("s2");
  });

  it("Replanner should inject auto_fix for low score", () => {
    const g = new ExecutionGraphRuntime();
    g.addNode({ id: "s1", tool: "create_deck", input: {} });
    g.addNode({ id: "s2", tool: "review_deck", input: {}, depends_on: ["s1"] });
    const replanner = new Replanner();
    const result = replanner.replan(g.toGraph(), { review_score: 40 });
    const hasAutoFix = result.graph.nodes.some(n => n.tool === "auto_fix_deck");
    expect(hasAutoFix).toBe(true);
    expect(result.mutations.some(m => m.type === "inject_auto_fix")).toBe(true);
  });

  it("Replanner should not inject auto_fix for high score", () => {
    const g = new ExecutionGraphRuntime();
    g.addNode({ id: "s1", tool: "create_deck", input: {} });
    g.addNode({ id: "s2", tool: "review_deck", input: {}, depends_on: ["s1"] });
    const replanner = new Replanner();
    const result = replanner.replan(g.toGraph(), { review_score: 85 });
    const hasAutoFix = result.graph.nodes.some(n => n.tool === "auto_fix_deck");
    expect(hasAutoFix).toBe(false);
  });

  it("ExecutionPolicy should trigger replan for low score", () => {
    const policy = new ExecutionPolicy();
    expect(policy.shouldReplan({ score: 40 })).toBe(true);
    expect(policy.shouldReplan({ score: 85 })).toBe(false);
    expect(policy.shouldReplan(null)).toBe(false);
  });
});

