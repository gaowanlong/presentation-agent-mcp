import { SlidePlan } from "../types/slide-plan.js";
import { ExecutionPlan, ExecutionStep } from "../types/execution-plan.js";
export function mapSlidePlanToExecution(sp: SlidePlan, ctx: { topic: string; slide_count: number }): ExecutionPlan {
  const steps: ExecutionStep[] = [];
  // Step 1: Create deck
  steps.push({ id: "create_deck", tool: "create_deck", input: { topic: ctx.topic, slide_count: Math.max(ctx.slide_count, 6), audience: "Technical", style_id: "allen_huawei_tech" }, retry_policy: { max_retry: 1, fallback: "skip" } });
  // Step 2: Update slides that need specific content
  let i = 0;
  for (const slide of sp.slides) {
    if (slide.type === "architecture" || slide.type === "roadmap" || slide.type === "summary") {
      const sid = "update_" + slide.id;
      steps.push({ id: sid, tool: "update_slide", input: { slide_id: slide.id, instruction: slide.intent }, depends_on: ["create_deck"], retry_policy: { max_retry: 1, fallback: "skip" } });
      i++;
    }
  }
  // Step 3: Review
  steps.push({ id: "review1", tool: "review_deck", input: {}, depends_on: ["create_deck", ...steps.filter(s => s.id.startsWith("update_")).map(s => s.id)], retry_policy: { max_retry: 1, fallback: "skip" } });
  // Step 4: Auto-fix
  if (sp.slides.some(s => s.type === "roadmap")) {
    steps.push({ id: "autofix", tool: "auto_fix_deck", input: {}, depends_on: ["review1"], retry_policy: { max_retry: 1, fallback: "skip" } });
  } else {
    steps.push({ id: "autofix", tool: "auto_fix_deck", input: {}, depends_on: ["review1"], retry_policy: { max_retry: 1, fallback: "skip" } });
  }
  // Step 5: Review again
  steps.push({ id: "review2", tool: "review_deck", input: {}, depends_on: ["autofix"], retry_policy: { max_retry: 1, fallback: "skip" } });
  // Step 6: Export
  steps.push({ id: "export", tool: "export_pptx", input: {}, depends_on: ["review2"], retry_policy: { max_retry: 1, fallback: "skip" } });
  return { steps };
}

