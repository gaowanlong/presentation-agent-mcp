import { describe, it, expect } from "vitest";
import { ExecutionGraphRuntime } from "../core/execution-graph.js";
import { GraphStateManager } from "../core/graph-state-manager.js";
import { Replanner } from "../core/replanner.js";
import { ExecutionPolicy } from "../planning/execution-policy.js";

describe("Golden Adaptive", () => {
  it("should replan when review score is low", () => {
    const g = new ExecutionGraphRuntime();
    g.addNode({ id: "s1", tool: "create_deck", input: { topic: "AI" } });
    g.addNode({ id: "s2", tool: "review_deck", input: {}, depends_on: ["s1"] });
    g.addNode({ id: "s3", tool: "export_pptx", input: {}, depends_on: ["s2"] });
    const sm = new GraphStateManager(); sm.init(g.nodes);
    const policy = new ExecutionPolicy();
    const replanner = new Replanner();

    // Simulate execution
    sm.setStatus("s1", "success");
    const reviewResult = { score: 45, issues: [{ type: "weak_title" }, { type: "generic_message" }] };
    expect(policy.shouldReplan(reviewResult)).toBe(true);
    const result = replanner.replan(g.toGraph(), { review_score: 45, auto_fix_applied: false });
    expect(result.graph.nodes.some(n => n.tool === "auto_fix_deck")).toBe(true);
  });

  it("should complete graph execution with replanning", () => {
    const g = new ExecutionGraphRuntime();
    g.addNode({ id: "s1", tool: "create_deck", input: { topic: "AI" } });
    g.addNode({ id: "s2", tool: "review_deck", input: {}, depends_on: ["s1"] });
    g.addNode({ id: "s3", tool: "export_pptx", input: {}, depends_on: ["s2"] });
    const sm = new GraphStateManager(); sm.init(g.nodes);
    const replanner = new Replanner();

    // Run simulation
    const completed = new Set<string>();
    completed.add("s1");
    const ready = g.getReadyNodes(completed);
    expect(ready.length).toBe(1);
    expect(ready[0].id).toBe("s2");

    // After review, replan
    const result = replanner.replan(g.toGraph(), { review_score: 40 });
    const newG = new ExecutionGraphRuntime();
    for (const n of result.graph.nodes) newG.addNode(n);
    sm.init(newG.nodes);
    const steps = newG.nodes.map(n => n.id + ":" + n.tool);
    expect(steps.some(s => s.includes("auto_fix"))).toBe(true);
  });
});

