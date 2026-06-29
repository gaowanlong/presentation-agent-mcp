import { describe, it, expect } from "vitest";
import { parseDeepResearch } from "../planning/deepresearch-parser.js";
import { SlidePlanner } from "../planning/slide-planner.js";
import { ExecutionPlanner } from "../planning/execution-planner.js";
import { ContextStore } from "../core/context-store.js";
import { TraceWriter } from "../core/trace-writer.js";
import { ExecutionEngine } from "../core/execution-engine.js";

const sample = "# AI Report\n## Background\nBg\n## Insights\nI1\nI2\n## Architecture\n3 layers\n## Roadmap\nQ1 plan\nQ2 build\n## Summary\nEnd.";

describe("V0.7 pipeline", () => {
  it("parse->plan->execution plan should produce steps", () => {
    const r = parseDeepResearch(sample);
    expect(r.topic).toBe("AI Report");
    const sp = new SlidePlanner().plan(r);
    expect(sp.slides.length).toBeGreaterThanOrEqual(4);
    const ep = new ExecutionPlanner().plan(sp, { topic: r.topic, slide_count: sp.slides.length });
    expect(ep.steps.length).toBeGreaterThanOrEqual(3);
    expect(ep.steps[0].tool).toBe("create_deck");
  });
  it("execution engine should run steps", async () => {
    const ctx = new ContextStore();
    const trace = new TraceWriter();
    const engine = new ExecutionEngine(ctx, trace);
    const mockMcp = { call: async (t: string, i: any) => ({ tool: t, input: i, status: "ok" }) };
    const plan = { steps: [{ step_id: "s1", tool: "create_deck", input: {}, retry: 1, fallback: "skip" as const }] };
    const results = await engine.run(plan as any, mockMcp as any);
    expect(results.nodes[0].status).toBe("success");
    expect(trace.getGraph().nodes.length).toBe(1);
  });
});
