import { describe, it, expect } from "vitest";
import { ReviewEngine } from "../src/runtime/review-engine.js";
import { Deck } from "../src/schema/deck.schema.js";

describe("ReviewEngine", () => {
  const engine = new ReviewEngine();

  function makeDeck(slides?: any[]): Deck {
    return {
      deck_id: "review_test",
      version: 1,
      title: "Review Test",
      topic: "AI",
      style_id: "allen_huawei_tech",
      slides: slides || [
        { slide_id: "s001", type: "title", title: "Architecture Overview" },
        { slide_id: "s002", type: "insight", title: "Key Insight", key_points: ["P1", "P2", "P3"] },
        { slide_id: "s003", type: "summary", title: "Summary", takeaways: ["T1", "T2"] },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  it("should flag missing agenda", () => {
    const deck = makeDeck();
    const result = engine.review(deck);
    expect(result.issues.some((i) => i.type === "missing_agenda")).toBe(true);
  });

  it("should flag missing summary", () => {
    const deck = makeDeck([
      { slide_id: "s001", type: "title", title: "Title" },
      { slide_id: "s002", type: "agenda", title: "Agenda", items: [{ label: "A" }] },
    ]);
    const result = engine.review(deck);
    expect(result.issues.some((i) => i.type === "missing_summary")).toBe(true);
  });

  it("should detect too many bullets", () => {
    const deck = makeDeck([
      { slide_id: "s001", type: "title", title: "Title" },
      { slide_id: "s002", type: "insight", title: "Insight", key_points: Array(7).fill("X") },
    ]);
    const result = engine.review(deck);
    expect(result.issues.some((i) => i.type === "too_many_bullets")).toBe(true);
  });

  it("should detect title too long", () => {
    const deck = makeDeck([
      { slide_id: "s001", type: "title", title: "T" },
      { slide_id: "s002", type: "insight", title: "这是一个非常长的标题用来测试标题长度限制的检测功能是否正常运作", key_points: ["P1"] },
    ]);
    const result = engine.review(deck);
    expect(result.issues.some((i) => i.type === "title_too_long")).toBe(true);
  });

  it("should detect empty insight slide", () => {
    const deck = makeDeck([
      { slide_id: "s001", type: "title", title: "Title" },
      { slide_id: "s002", type: "insight", title: "Insight", key_points: [] },
    ]);
    const result = engine.review(deck);
    expect(result.issues.some((i) => i.type === "empty_slide")).toBe(true);
  });

  it("should detect unbalanced comparison", () => {
    const deck = makeDeck([
      { slide_id: "s001", type: "title", title: "Title" },
      { slide_id: "s002", type: "comparison", title: "Comparison",
        left: { title: "L", points: ["A", "B", "C"] },
        right: { title: "R", points: ["D"] } },
    ]);
    const result = engine.review(deck);
    expect(result.issues.some((i) => i.type === "unbalanced_comparison")).toBe(true);
  });

  it("should detect too many architecture layers", () => {
    const deck = makeDeck([
      { slide_id: "s001", type: "title", title: "Title" },
      { slide_id: "s002", type: "architecture", title: "Arch", layers: Array(6).fill({ name: "L", components: ["A"] }) },
    ]);
    const result = engine.review(deck);
    expect(result.issues.some((i) => i.type === "too_many_architecture_layers")).toBe(true);
  });

  it("should calculate score correctly", () => {
    const deck = makeDeck();
    const result = engine.review(deck);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("should provide suggestions", () => {
    const deck = makeDeck();
    const result = engine.review(deck);
    expect(result.suggestions.length).toBeGreaterThan(0);
  });

  // ── V0.3 new check tests ────────────────────────────────────────────

  it("should detect weak title", () => {
    const deck = makeDeck([
      { slide_id: "s001", type: "title", title: "标题" },
      { slide_id: "s002", type: "insight", title: "Insight", key_points: ["P1"] },
    ]);
    const result = engine.review(deck);
    expect(result.issues.some((i) => i.type === "weak_title")).toBe(true);
  });

  it("should detect generic message", () => {
    const deck = makeDeck([
      { slide_id: "s001", type: "title", title: "Title" },
      { slide_id: "s002", type: "insight", title: "Insight", key_points: ["P1"],
        message: "关于 AI 的技术洞察" },
      { slide_id: "s003", type: "summary", title: "Summary", takeaways: ["T"] },
    ]);
    const result = engine.review(deck);
    expect(result.issues.some((i) => i.type === "generic_message")).toBe(true);
  });

  it("should detect duplicate slide message", () => {
    const deck = makeDeck([
      { slide_id: "s001", type: "title", title: "Title" },
      { slide_id: "s002", type: "insight", title: "Insight", key_points: ["P1"], message: "Same message" },
      { slide_id: "s003", type: "insight", title: "Insight 2", key_points: ["P2"], message: "Same message" },
    ]);
    const result = engine.review(deck);
    expect(result.issues.some((i) => i.type === "duplicate_slide_message")).toBe(true);
  });

  it("should detect missing evidence for insight claim", () => {
    const deck = makeDeck([
      { slide_id: "s001", type: "title", title: "Title" },
      { slide_id: "s002", type: "insight", title: "Insight", key_points: ["Claim without evidence"] },
      { slide_id: "s003", type: "summary", title: "Summary", takeaways: ["T"] },
    ]);
    const result = engine.review(deck);
    expect(result.issues.some((i) => i.type === "missing_evidence_for_claim")).toBe(true);
  });

  it("should detect roadmap without timeframe", () => {
    const deck = makeDeck([
      { slide_id: "s001", type: "title", title: "Title" },
      { slide_id: "s002", type: "roadmap", title: "Roadmap",
        phases: [{ name: "Phase 1", status: "planned" }] },
    ]);
    const result = engine.review(deck);
    expect(result.issues.some((i) => i.type === "roadmap_without_timeframe")).toBe(true);
  });

  it("should not give a perfect score on a deck with issues", () => {
    const deck = makeDeck(); // Missing agenda
    const result = engine.review(deck);
    expect(result.score).toBeLessThan(100);
    expect(result.issues.length).toBeGreaterThan(0);
  });
});
