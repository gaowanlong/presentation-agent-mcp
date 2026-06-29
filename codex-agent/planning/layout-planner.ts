import { ResearchContext } from "../types/research.js";
import { LayoutPlan, LayoutType } from "../layout/layout-plan.js";

export class LayoutPlanner {
  plan(research: ResearchContext): LayoutPlan[] {
    const plans: LayoutPlan[] = [];
    let sid = 0;
    const nid = () => "s" + String(++sid).padStart(3, "0");

    // Title slide
    plans.push({ slide_id: nid(), layout_type: "title", slots: [{ name: "title_text", type: "text", constraint: "presentation title" }, { name: "subtitle", type: "text", constraint: "subtitle/context", max_length: 80 }] });

    // Agenda
    plans.push({ slide_id: nid(), layout_type: "two_column", slots: [{ name: "section_list", type: "bullet", constraint: "agenda items" }, { name: "overview", type: "text", constraint: "presentation overview" }] });

    // Background / context insight
    plans.push({ slide_id: nid(), layout_type: "four_grid", slots: [
      { name: "challenge", type: "text", constraint: "problem statement" },
      { name: "trend", type: "text", constraint: "industry trend" },
      { name: "data_point", type: "metric", constraint: "key metric" },
      { name: "implication", type: "callout", constraint: "what this means" },
    ]});

    // Comparison
    plans.push({ slide_id: nid(), layout_type: "two_column", slots: [
      { name: "left_column", type: "bullet", constraint: "traditional approach" },
      { name: "right_column", type: "bullet", constraint: "new approach" },
      { name: "conclusion", type: "callout", constraint: "verdict", max_length: 100 },
    ]});

    // Key insight (four_grid for key tech)
    plans.push({ slide_id: nid(), layout_type: "four_grid", slots: [
      { name: "challenge", type: "text", constraint: "technical challenge" },
      { name: "solution", type: "text", constraint: "technical approach" },
      { name: "diagram_hint", type: "diagram", constraint: "architecture view" },
      { name: "benefit", type: "metric", constraint: "impact metrics" },
    ]});

    // Second insight
    plans.push({ slide_id: nid(), layout_type: "four_grid", slots: [
      { name: "finding", type: "text", constraint: "key finding" },
      { name: "evidence", type: "metric", constraint: "supporting data" },
      { name: "analysis", type: "text", constraint: "deeper analysis" },
      { name: "takeaway", type: "callout", constraint: "what to remember" },
    ]});

    // Architecture → DIAGRAM_TEXT (most important)
    plans.push({ slide_id: nid(), layout_type: "diagram_text", slots: [
      { name: "diagram", type: "diagram", constraint: "system architecture diagram" },
      { name: "key_mechanism", type: "text", constraint: "core mechanism explanation" },
      { name: "tradeoff", type: "callout", constraint: "design tradeoffs", max_length: 80 },
    ]});

    // Summary
    plans.push({ slide_id: nid(), layout_type: "challenge_solution_benefit", slots: [
      { name: "challenge", type: "text", constraint: "core challenge" },
      { name: "solution", type: "text", constraint: "proposed solution" },
      { name: "benefit", type: "metric", constraint: "key outcomes" },
      { name: "next_steps", type: "bullet", constraint: "action items" },
    ]});

    return plans;
  }
}

