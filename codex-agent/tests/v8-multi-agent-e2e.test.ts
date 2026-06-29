import { describe, it, expect } from "vitest";
import { MessageBus, AgentType } from "../core/message-bus.js";
import { ExecutionGraphRuntime } from "../core/execution-graph.js";
import { GraphStateManager } from "../core/graph-state-manager.js";
import { Replanner } from "../core/replanner.js";

describe("V0.8 Multi-Agent", () => {
  it("MessageBus should route messages between agents", () => {
    const bus = new MessageBus();
    bus.send("executor", { from: "orchestrator", type: "execute", payload: { tool: "create_deck" } });
    bus.send("reviewer", { from: "orchestrator", type: "review", payload: { deck: {} } });
    expect(bus.pendingCount("executor")).toBe(1);
    expect(bus.pendingCount("reviewer")).toBe(1);
    const msg = bus.receive("executor");
    expect(msg).toBeTruthy();
    expect(msg!.to).toBe("executor");
    expect(msg!.payload.tool).toBe("create_deck");
  });

  it("MessageBus should maintain history", () => {
    const bus = new MessageBus();
    bus.send("planner", { from: "orchestrator", type: "plan", payload: { text: "AI" } });
    bus.send("fixer", { from: "orchestrator", type: "fix", payload: { patches: [] } });
    expect(bus.getHistory().length).toBe(2);
  });

  it("ExecutionGraph should support insertNodeAfter", () => {
    const g = new ExecutionGraphRuntime();
    g.addNode({ id: "s1", tool: "create_deck", input: {} });
    g.addNode({ id: "s2", tool: "review_deck", input: {}, depends_on: ["s1"] });
    g.insertNodeAfter("s1", { id: "autofix", tool: "auto_fix_deck", input: {}, depends_on: ["s1"] });
    const autoFix = g.getNode("autofix");
    expect(autoFix).toBeTruthy();
    expect(autoFix!.tool).toBe("auto_fix_deck");
    expect(g.nodes.length).toBe(3);
  });

  it("ExecutionGraph should support injectFixStep", () => {
    const g = new ExecutionGraphRuntime();
    g.addNode({ id: "s1", tool: "create_deck", input: {} });
    g.injectFixStep({ id: "fix1", tool: "auto_fix_deck", input: {} }, "s1");
    expect(g.nodes.length).toBe(2);
    expect(g.getNode("fix1")).toBeTruthy();
  });

  it("ExecutionGraph should support forkExecution", () => {
    const g = new ExecutionGraphRuntime();
    g.addNode({ id: "s1", tool: "create_deck", input: {} });
    g.forkExecution("s1", [
      [{ id: "b1", tool: "review_deck", input: {} }],
      [{ id: "b2", tool: "auto_fix_deck", input: {} }],
    ]);
    expect(g.getNode("s1")).toBeUndefined();
    expect(g.getNode("b1")).toBeTruthy();
    expect(g.getNode("b2")).toBeTruthy();
  });

  it("Replanner should inject fix step for low score", () => {
    const g = new ExecutionGraphRuntime();
    g.addNode({ id: "s1", tool: "create_deck", input: {} });
    g.addNode({ id: "s2", tool: "review_deck", input: {}, depends_on: ["s1"] });
    const replanner = new Replanner();
    const result = replanner.replan(g.toGraph(), { review_score: 40, auto_fix_applied: false });
    expect(result.graph.nodes.some(n => n.tool === "auto_fix_deck")).toBe(true);
    expect(result.mutations.some(m => m.type === "inject_auto_fix")).toBe(true);
  });
});

