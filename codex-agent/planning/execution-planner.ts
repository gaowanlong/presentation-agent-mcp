import { SlidePlan } from "../types/slide-plan.js";
import { ExecutionPlan } from "../types/execution-plan.js";
export class ExecutionPlanner {
  plan(sp: SlidePlan, ctx: { topic: string; slide_count: number }): ExecutionPlan {
    return { steps: [
      { step_id: "create_deck", tool: "create_deck", input: { topic: ctx.topic, slide_count: Math.max(ctx.slide_count,6), audience: "Technical", style_id: "allen_huawei_tech" }, retry: 1, fallback: "skip" },
      { step_id: "review1", tool: "review_deck", input: {}, depends_on: ["create_deck"], fallback: "skip" },
      { step_id: "autofix", tool: "auto_fix_deck", input: {}, depends_on: ["review1"], fallback: "skip" },
      { step_id: "review2", tool: "review_deck", input: {}, depends_on: ["autofix"], fallback: "skip" },
      { step_id: "export", tool: "export_pptx", input: {}, depends_on: ["review2"], fallback: "skip" },
    ]};
  }
}