import { describe, it, expect } from "vitest";
import { LayoutPlanner } from "../planning/layout-planner.js";
import { SlotFiller } from "../generator/slot-filler.js";
import { ContentDeduplicator } from "../planning/content-deduplicator.js";
import { planHasDiagram, planHasMetric } from "../layout/layout-plan.js";
import { ResearchContext } from "../types/research.js";

const mockResearch: ResearchContext = {
  topic: "AI Architecture Evolution",
  sections: {
    background: ["End-side AI is evolving from inference to agent tasks"],
    insights: ["NPU prefill is 18x faster than CPU", "60% of AI scenarios are memory bound", "Dynamic scheduling improves utilization by 30%"],
    architecture: "Three-layer architecture: Application Layer, Runtime Layer, Kernel Layer",
    roadmap: "Q1 Research, Q2 PoC, Q3 Development, Q4 Deployment",
    implications: ["Re-architect kernel for agent workloads", "Unify resource management abstractions"],
  },
};

describe("Layout-first System", () => {
  it("LayoutPlanner should produce 8 layout plans for a standard deck", () => {
    const planner = new LayoutPlanner();
    const plans = planner.plan(mockResearch);
    expect(plans.length).toBe(8);
  });

  it("every layout plan should have at least 2 slots", () => {
    const planner = new LayoutPlanner();
    const plans = planner.plan(mockResearch);
    for (const plan of plans) expect(plan.slots.length).toBeGreaterThanOrEqual(2);
  });

  it("every slide should have at least 1 diagram or metric slot", () => {
    const planner = new LayoutPlanner();
    const plans = planner.plan(mockResearch);
    for (const plan of plans) {
      const hasDiagramOrMetric = planHasDiagram(plan) || planHasMetric(plan);
      expect(hasDiagramOrMetric).toBe(true);
    }
  });

  it("architecture slide should use diagram_text layout", () => {
    const planner = new LayoutPlanner();
    const plans = planner.plan(mockResearch);
    const archSlide = plans[6]; // 7th slide
    expect(archSlide.layout_type).toBe("diagram_text");
    expect(archSlide.slots.some(s => s.type === "diagram")).toBe(true);
  });

  it("key insight should use four_grid layout", () => {
    const planner = new LayoutPlanner();
    const plans = planner.plan(mockResearch);
    const insightSlide = plans[4]; // 5th slide (key insight)
    expect(insightSlide.layout_type).toBe("four_grid");
  });

  it("SlotFiller should fill all slots without missing any", () => {
    const planner = new LayoutPlanner();
    const filler = new SlotFiller();
    const plans = planner.plan(mockResearch);
    const filled = filler.fill(plans, mockResearch);
    expect(filled.length).toBe(8);
    for (const slide of filled) {
      expect(slide.filled_slots.length).toBeGreaterThanOrEqual(2);
      for (const slot of slide.filled_slots) {
        expect(slot.content).toBeTruthy();
        expect(slot.content.length).toBeGreaterThan(0);
      }
    }
  });

  it("ContentDeduplicator should handle duplicate content", () => {
    const filler = new SlotFiller();
    const dedup = new ContentDeduplicator();
    const planner = new LayoutPlanner();
    const plans = planner.plan(mockResearch);
    const filled = filler.fill(plans, mockResearch);
    const deduplicated = dedup.deduplicate(filled);
    expect(deduplicated.length).toBe(8);
    const stats = dedup.getStats();
    expect(stats.total_units).toBeGreaterThan(0);
  });

  it("no duplicate content across slides after deduplication", () => {
    const filler = new SlotFiller();
    const dedup = new ContentDeduplicator();
    const planner = new LayoutPlanner();
    const plans = planner.plan(mockResearch);
    const filled = filler.fill(plans, mockResearch);
    const deduplicated = dedup.deduplicate(filled);

    // Check no two filled slides have identical content
    const allContent = deduplicated.flatMap(s => s.filled_slots.map(fs => fs.content));
    const unique = new Set(allContent);
    // Some content might be marked as "[see related content...]" which is OK
    const duplicates = allContent.filter(c => !c.startsWith("[see"));
    const uniqueDeduped = new Set(duplicates);
    expect(duplicates.length).toBe(uniqueDeduped.size);
  });
});

