import { ExecutionStep } from "../types/execution-plan.js";
import { ExecutionGraph, GraphEdge } from "../types/execution-graph.js";
import { generateId } from "../../src/utils/ids.js";

export interface ReplanContext { review_score?: number; tool_failures?: number; missing_slide_types?: string[]; auto_fix_applied?: boolean; }
export interface ReplanResult { graph: ExecutionGraph; mutations: ReplanMutation[]; }
export interface ReplanMutation { type: "insert_step" | "remove_step" | "replace_step" | "reorder_step" | "inject_auto_fix"; step_id?: string; detail: string; }

export class Replanner {
  replan(graph: ExecutionGraph, ctx: ReplanContext): ReplanResult {
    const mutations: ReplanMutation[] = [];
    const nodes = [...graph.nodes];
    const edges = [...graph.edges];

    // Rule 1: Low review score → inject auto_fix
    if ((ctx.review_score !== undefined && ctx.review_score < 60) || (ctx.auto_fix_applied === false)) {
      if (!nodes.some(n => n.tool === "auto_fix_deck")) {
        const autoFixId = "auto_fix_" + generateId("").slice(0, 8);
        const lastReview = nodes.filter(n => n.tool === "review_deck").pop();
        nodes.push({ id: autoFixId, tool: "auto_fix_deck", input: {}, depends_on: lastReview ? [lastReview.id] : undefined, retry_policy: { max_retry: 1, fallback: "skip" } });
        if (lastReview) edges.push({ from: lastReview.id, to: autoFixId, type: "depends_on" });
        mutations.push({ type: "inject_auto_fix", step_id: autoFixId, detail: "Auto-fix injected due to low score" });
      }
    }

    // Rule 2: Tool failures ≥ 2 → replan with retry
    if ((ctx.tool_failures || 0) >= 2) {
      const failedSteps = nodes.filter(n => n.retry_policy?.fallback === "skip");
      for (const step of failedSteps) {
        mutations.push({ type: "replace_step", step_id: step.id, detail: "Retry with rule_based fallback" });
      }
    }

    // Rule 3: Missing slide types → insert update steps
    if (ctx.missing_slide_types && ctx.missing_slide_types.length > 0) {
      for (const st of ctx.missing_slide_types) {
        mutations.push({ type: "insert_step", detail: "Missing slide type: " + st });
      }
    }

    return { graph: { nodes, edges }, mutations };
  }
}

