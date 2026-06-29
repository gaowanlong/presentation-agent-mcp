import { describe, it, expect } from "vitest";
import { SlidePlanner } from "../planning/slide-planner.js";

describe("SlidePlanner", () => {
  it("should plan slides for research", () => {
    const planner = new SlidePlanner();
    const plan = planner.plan({ topic: "AI", sections: { background: ["Bg"], insights: ["I1"], architecture: "Arch", roadmap: "Road", implications: [] } });
    expect(plan.slides.length).toBeGreaterThanOrEqual(4);
    expect(plan.slides.some(s => s.type === "architecture")).toBe(true);
    expect(plan.slides.some(s => s.type === "summary")).toBe(true);
  });
  it("should include roadmap when present", () => {
    const planner = new SlidePlanner();
    const plan = planner.plan({ topic: "AI", sections: { background: ["Bg"], insights: ["I1"], architecture: "Arch", roadmap: "Road", implications: ["Impl"] } });
    expect(plan.slides.some(s => s.type === "roadmap")).toBe(true);
  });
  it("should not require roadmap", () => {
    const planner = new SlidePlanner();
    const plan = planner.plan({ topic: "AI", sections: { background: ["Bg"], insights: ["I1"], architecture: "Arch", roadmap: "", implications: [] } });
    expect(plan.slides.some(s => s.type === "roadmap")).toBe(false);
  });
});
