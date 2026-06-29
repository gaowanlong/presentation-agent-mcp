import { describe, it, expect } from "vitest";
import { parseDeepResearch } from "../planning/deepresearch-parser.js";
import { SlidePlanner } from "../planning/slide-planner.js";
import { mapSlidePlanToExecution } from "../planning/plan-mapper.js";

const sample = "# AI Report\n## Background\nEnd-side AI load is evolving\n## Insights\nNPU prefills are 18x faster than CPU\n60% of AI scenarios are memory bound\n## Architecture\nUser-mode Agent Runtime + Kernel Control Plane\n## Roadmap\nQ1: Research\nQ2: PoC\nQ3: Development\n## Summary\nRe-architect for Agent workloads\n";

describe("Golden Run", () => {
  it("slide_count >= 6", () => {
    const r = parseDeepResearch(sample);
    const sp = new SlidePlanner().plan(r);
    expect(sp.slides.length).toBeGreaterThanOrEqual(6);
  });

  it("has architecture slide", () => {
    const r = parseDeepResearch(sample);
    const sp = new SlidePlanner().plan(r);
    expect(sp.slides.some(s => s.type === "architecture")).toBe(true);
  });

  it("has roadmap slide", () => {
    const r = parseDeepResearch(sample);
    const sp = new SlidePlanner().plan(r);
    expect(sp.slides.some(s => s.type === "roadmap")).toBe(true);
  });

  it("has summary slide (last)", () => {
    const r = parseDeepResearch(sample);
    const sp = new SlidePlanner().plan(r);
    expect(sp.slides[sp.slides.length - 1].type).toBe("summary");
  });

  it("execution plan has valid DAG structure", () => {
    const r = parseDeepResearch(sample);
    const sp = new SlidePlanner().plan(r);
    const ep = mapSlidePlanToExecution(sp, { topic: r.topic, slide_count: sp.slides.length });
    expect(ep.steps.length).toBeGreaterThanOrEqual(4);
    // All steps must have ids
    for (const step of ep.steps) expect(step.id).toBeTruthy();
    // Dependencies must reference valid step ids
    const ids = new Set(ep.steps.map(s => s.id));
    for (const step of ep.steps) {
      if (step.depends_on) for (const dep of step.depends_on) expect(ids.has(dep)).toBe(true);
    }
  });

  it("architecture slide triggers review", () => {
    const r = parseDeepResearch(sample);
    const sp = new SlidePlanner().plan(r);
    const ep = mapSlidePlanToExecution(sp, { topic: r.topic, slide_count: sp.slides.length });
    expect(ep.steps.some(s => s.tool === "review_deck")).toBe(true);
  });

  it("roadmap slide triggers auto_fix", () => {
    const r = parseDeepResearch(sample);
    const sp = new SlidePlanner().plan(r);
    const ep = mapSlidePlanToExecution(sp, { topic: r.topic, slide_count: sp.slides.length });
    expect(ep.steps.some(s => s.tool === "auto_fix_deck")).toBe(true);
  });
});

