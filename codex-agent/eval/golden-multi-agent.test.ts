import { describe, it, expect } from "vitest";
import { MessageBus, createMessage } from "../core/message-bus.js";
import { ExecutionGraphRuntime } from "../core/execution-graph.js";

describe("Golden Multi-Agent", () => {
  it("agents should communicate through bus without direct coupling", () => {
    const bus = new MessageBus();
    bus.send(createMessage("orchestrator", "planner", "build_slide_plan", "Plan", { artifacts: { text: "AI architecture report" } }));
    bus.send(createMessage("orchestrator", "executor", "execute_tool", "Execute", { artifacts: { tool: "create_deck" } }));
    bus.send(createMessage("orchestrator", "reviewer", "evaluate_quality", "Review", { artifacts: { deck: {} } }));
    bus.send(createMessage("orchestrator", "fixer", "fix_issues", "Fix", { artifacts: { patches: [] } }));
    expect(bus.getHistory().length).toBe(4);
    // Verify no cross-responsibility
    const executeMsgs = bus.getHistory().filter(m => m.intent === "execute_tool");
    const reviewMsgs = bus.getHistory().filter(m => m.intent === "evaluate_quality");
    const fixMsgs = bus.getHistory().filter(m => m.intent === "fix_issues");
    expect(executeMsgs.length).toBe(1);
    expect(reviewMsgs.length).toBe(1);
    expect(fixMsgs.length).toBe(1);
  });

  it("graph should support multi-agent mutation", () => {
    const g = new ExecutionGraphRuntime();
    g.addNode({ id: "s1", tool: "create_deck", input: {} });
    g.addNode({ id: "s2", tool: "review_deck", input: {}, depends_on: ["s1"] });
    // Simulate reviewer finding issues → fixer injects step
    g.injectFixStep({ id: "f1", tool: "auto_fix_deck", input: {}, depends_on: ["s2"] });
    expect(g.nodes.length).toBe(3);
    g.injectFixStep({ id: "f2", tool: "auto_fix_deck", input: {}, depends_on: ["f1"] });
    expect(g.nodes.length).toBe(4);
    // Simulate replan
    g.forkExecution("s1", [
      [{ id: "alt1", tool: "create_deck", input: {} }],
    ]);
    expect(g.getNode("s1")).toBeUndefined();
    expect(g.getNode("alt1")).toBeTruthy();
  });
});

