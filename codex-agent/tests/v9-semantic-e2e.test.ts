import { describe, it, expect } from "vitest";
import { createMessage, SemanticMessage } from "../core/semantic-message.js";
import { MessageBus } from "../core/message-bus.js";
import { ContractRegistry } from "../agents/contracts/contract-registry.js";
import { IntentRouter } from "../core/intent-router.js";
import { NegotiationEngine } from "../core/negotiation-engine.js";
import { ExecutionGraphRuntime } from "../core/execution-graph.js";

describe("V0.9 Semantic System", () => {
  it("SemanticMessage should carry intent not type", () => {
    const msg = createMessage("planner", "orchestrator", "build_slide_plan", "Plan slides");
    expect(msg.intent).toBe("build_slide_plan");
    expect(msg.context.goal).toBe("Plan slides");
    expect(msg.priority).toBe("medium");
  });

  it("MessageBus should route by intent", () => {
    const bus = new MessageBus();
    bus.send(createMessage("planner", "orchestrator", "build_slide_plan", "Plan"));
    bus.send(createMessage("reviewer", "orchestrator", "evaluate_quality", "Review"));
    const plans = bus.route_by_intent("build_slide_plan");
    expect(plans.length).toBe(1);
    expect(plans[0].from).toBe("planner");
  });

  it("ContractRegistry should validate allowed intents", () => {
    const reg = new ContractRegistry();
    reg.registerDefaults();
    const executorContract = reg.get("executor")!;
    expect(executorContract.allowed_intents).toContain("execute_tool");
    expect(executorContract.forbidden_actions).toContain("planning");
    const valid = reg.validate("executor", createMessage("orchestrator", "executor", "execute_tool", "Run", { priority: "high" }));
    expect(valid.valid).toBe(true);
    const invalid = reg.validate("executor", createMessage("orchestrator", "executor", "planning", "Plan", { priority: "high" }));
    expect(invalid.valid).toBe(false);
  });

  it("IntentRouter should resolve agent from intent", () => {
    const router = new IntentRouter();
    expect(router.resolve("build_slide_plan")).toBe("planner");
    expect(router.resolve("execute_tool")).toBe("executor");
    expect(router.resolve("evaluate_quality")).toBe("reviewer");
    expect(router.resolve("fix_issues")).toBe("fixer");
  });

  it("NegotiationEngine should resolve quality conflicts", () => {
    const engine = new NegotiationEngine();
    const reviewMsg = createMessage("reviewer", "orchestrator", "evaluate_quality", "Review", { artifacts: { score: 40 } });
    const planMsg = createMessage("planner", "orchestrator", "build_slide_plan", "Plan", { artifacts: { slides: [1,2,3,4,5,6] } });
    const result = engine.resolve([{ type: "quality_vs_complexity", messages: [reviewMsg, planMsg], description: "Low score" }], [reviewMsg, planMsg]);
    expect(result.resolved).toBe(true);
    expect(result.decisions[0]).toContain("Low score overrides complexity");
    expect(result.updated_messages.some(m => m.intent === "fix_issues")).toBe(true);
  });

  it("Semantic ExecutionGraph should find nodes by intent", () => {
    const g = new ExecutionGraphRuntime();
    g.addNode({ id: "s1", tool: "create_deck", input: {} });
    g.addNode({ id: "s2", tool: "review_deck", input: {}, depends_on: ["s1"] });
    g.addNodeWithIntent({ id: "s3", tool: "auto_fix_deck", input: {}, depends_on: ["s2"] }, "fix_issues", "Fix quality", 0.9);
    const reviewNodes = g.findByIntent("execute_tool");
    expect(reviewNodes.length).toBe(2);
    const fixNodes = g.findByIntent("fix_issues");
    expect(fixNodes.length).toBe(1);
    expect(g.scoreNode("s3")).toBe(0.9);
  });

  it("Semantic ExecutionGraph should mutate by intent", () => {
    const g = new ExecutionGraphRuntime();
    g.addNodeWithIntent({ id: "s1", tool: "create_deck", input: {} }, "execute_tool", "Create deck", 0.8);
    g.mutateByIntent("execute_tool", n => ({ ...n, confidence: n.confidence * 1.1 }));
    expect(g.scoreNode("s1")).toBe(0.88);
  });

  it("ContractRegistry should enforce no cross-agent responsibilities", () => {
    const reg = new ContractRegistry();
    reg.registerDefaults();
    const exec = reg.get("executor")!;
    expect(exec.forbidden_actions).toContain("planning");
    expect(exec.forbidden_actions).toContain("scoring");
    const reviewer = reg.get("reviewer")!;
    expect(reviewer.forbidden_actions).toContain("execute_mcp");
    const fixer = reg.get("fixer")!;
    expect(fixer.forbidden_actions).toContain("execute_mcp");
    const planner = reg.get("planner")!;
    expect(planner.forbidden_actions).toContain("execute_mcp");
  });

  it("detect_conflict should find quality vs complexity", () => {
    const bus = new MessageBus();
    bus.send(createMessage("reviewer", "orchestrator", "evaluate_quality", "Review", { artifacts: { score: 40 } }));
    bus.send(createMessage("planner", "orchestrator", "build_slide_plan", "Plan", { artifacts: { slides: [1,2,3,4,5,6] } }));
    const conflicts = bus.detect_conflict();
    expect(conflicts.length).toBe(1);
    expect(conflicts[0].type).toBe("quality_vs_complexity");
  });
});

