import { describe, it, expect } from "vitest";
import { LayoutEngine } from "../src/layout/layout-engine.js";
import { Deck, RoadmapSlide, TimelineSlide, CaseStudySlide } from "../src/schema/deck.schema.js";

function makeDeck(): Deck {
  return {
    deck_id: "test_deck", version: 1, title: "Test", topic: "Test Topic", style_id: "allen_huawei_tech",
    slides: [
      { slide_id: "s001", type: "title", title: "Test Title", subtitle: "Sub", author: "Author", date: "2024-01-01" },
      { slide_id: "s002", type: "agenda", title: "Agenda", items: [{ label: "Section 1", description: "Desc 1" }, { label: "Section 2" }] },
      { slide_id: "s003", type: "insight", title: "Insight", key_points: ["Point 1", "Point 2", "Point 3"], evidence: [{ label: "Metric A", value: "95%", description: "Performance" }] },
      { slide_id: "s004", type: "comparison", title: "Comparison", left: { title: "Left", points: ["A", "B"] }, right: { title: "Right", points: ["C", "D"] }, conclusion: "Right wins" },
      { slide_id: "s005", type: "architecture", title: "Architecture", layers: [{ name: "App Layer", components: ["UI", "API"] }, { name: "Core Layer", components: ["Engine", "Runtime"] }] },
      { slide_id: "s006", type: "summary", title: "Summary", takeaways: ["T1", "T2", "T3"], next_steps: ["N1", "N2"] },
      { slide_id: "s007", type: "roadmap", title: "Roadmap", phases: [{ name: "Phase 1", status: "completed", timeline: "Q1" }, { name: "Phase 2", status: "in_progress" }] },
      { slide_id: "s008", type: "timeline", title: "Timeline", events: [{ date: "2024 Q1", title: "Event 1" }, { date: "2024 Q2", title: "Event 2" }] },
      { slide_id: "s009", type: "case_study", title: "Case Study", context: "Context", challenge: "Challenge", solution: "Solution", results: ["R1", "R2"] },
    ],
    created_at: "2024-01-01T00:00:00.000Z", updated_at: "2024-01-01T00:00:00.000Z",
  };
}

describe("LayoutEngine", () => {
  const engine = new LayoutEngine();

  it("should produce layout for every slide type including new V0.2 types", () => {
    const deck = makeDeck();
    const layouted = engine.layout(deck);
    expect(layouted.slides).toHaveLength(9);
    for (const slide of layouted.slides) {
      expect(slide.elements.length).toBeGreaterThan(0);
    }
  });

  it("should have valid elements with coordinates within bounds", () => {
    const deck = makeDeck();
    const layouted = engine.layout(deck);
    for (const slide of layouted.slides) {
      for (const el of slide.elements) {
        expect(el.x).toBeGreaterThanOrEqual(0);
        expect(el.y).toBeGreaterThanOrEqual(0);
        expect(el.w).toBeGreaterThan(0);
        expect(el.h).toBeGreaterThan(0);
      }
    }
  });

  it("should render roadmap slide with phase cards", () => {
    const deck = makeDeck();
    const layouted = engine.layout(deck);
    const roadmapSlide = layouted.slides[6]; // s007
    expect(roadmapSlide.type).toBe("roadmap");
    const shapes = roadmapSlide.elements.filter(e => e.kind === "shape");
    expect(shapes.length).toBeGreaterThanOrEqual(3); // bg + header + phase cards
    // Should have status bar rectangles (completed = green, in_progress = orange)
    const rects = roadmapSlide.elements.filter(e => e.kind === "shape" && e.shape === "rect");
    const rectFillColors = rects.map(r => (r as any).fill).filter(Boolean);
    expect(rectFillColors.length).toBeGreaterThanOrEqual(1);
  });

  it("should render timeline slide with vertical line", () => {
    const deck = makeDeck();
    const layouted = engine.layout(deck);
    const timelineSlide = layouted.slides[7]; // s008
    expect(timelineSlide.type).toBe("timeline");
    const texts = timelineSlide.elements.filter(e => e.kind === "text");
    const hasDateText = texts.some(t => (t as any).text === "2024 Q1");
    expect(hasDateText).toBe(true);
  });

  it("should render case_study slide with context/challenge/solution", () => {
    const deck = makeDeck();
    const layouted = engine.layout(deck);
    const csSlide = layouted.slides[8]; // s009
    expect(csSlide.type).toBe("case_study");
    const texts = csSlide.elements.filter(e => e.kind === "text");
    const labels = texts.filter(t => (t as any).role === "label");
    const labelTexts = labels.map(l => (l as any).text);
    expect(labelTexts).toContain("背景");
    expect(labelTexts).toContain("挑战");
    expect(labelTexts).toContain("方案");
    expect(labelTexts).toContain("效果");
  });

  it("should not allow elements to exceed canvas width", () => {
    const deck = makeDeck();
    const layouted = engine.layout(deck);
    for (const slide of layouted.slides) {
      for (const el of slide.elements) {
        expect(el.x + el.w).toBeLessThanOrEqual(13.4);
      }
    }
  });

  it("should include page numbers for each slide", () => {
    const deck = makeDeck();
    const layouted = engine.layout(deck);
    expect(layouted.slides).toHaveLength(9);
  });
});
