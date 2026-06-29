import { describe, it, expect } from "vitest";
import { AutoFixEngine } from "../src/autofix/auto-fix-engine.js";
import { generateDeck } from "../src/runtime/deck-generator.js";
import { generateStoryline } from "../src/runtime/storyline-planner.js";
import { ReviewEngine } from "../src/runtime/review-engine.js";
import { Deck } from "../src/schema/deck.schema.js";

describe("AutoFixEngine", () => {
  const reviewEngine = new ReviewEngine();

  function makeDeckWithIssues(): Deck {
    return {
      deck_id: "fix_test",
      version: 1,
      title: "Fix Test",
      topic: "AI",
      style_id: "allen_huawei_tech",
      slides: [
        { slide_id: "s001", type: "title", title: "标题" },
        { slide_id: "s002", type: "insight", title: "Insight", key_points: Array(7).fill("X") },
        { slide_id: "s003", type: "roadmap", title: "Roadmap", phases: [{ name: "P1", status: "planned" }] },
      ],
      created_at: "2024-01-01T00:00:00.000Z",
      updated_at: "2024-01-01T00:00:00.000Z",
    };
  }

  it("should improve deck review score", () => {
    const engine = new AutoFixEngine();
    const deck = makeDeckWithIssues();
    const beforeScore = reviewEngine.review(deck).score;

    const result = engine.autoFix(deck);

    const afterScore = reviewEngine.review(deck).score;
    expect(result.deck_id).toBe("fix_test");
    expect(result.before_score).toBeLessThan(100);
    expect(result.patches.length).toBeGreaterThan(0);
    expect(result.improvements.length).toBeGreaterThan(0);
    // Score should not decrease
    expect(afterScore).toBeGreaterThanOrEqual(beforeScore);
  });

  it("should fix weak_title issues", () => {
    const engine = new AutoFixEngine();
    const deck = makeDeckWithIssues();
    engine.autoFix(deck);
    const titleSlide = deck.slides[0];
    expect(titleSlide.title).not.toBe("标题"); // should be fixed
  });

  it("should fix too_many_bullets issues", () => {
    const engine = new AutoFixEngine();
    const deck = makeDeckWithIssues();
    engine.autoFix(deck);
    const insight = deck.slides[1];
    if (insight.type === "insight") {
      expect(insight.key_points.length).toBeLessThanOrEqual(5);
    }
  });

  it("should fix roadmap_without_timeframe issues", () => {
    const engine = new AutoFixEngine();
    const deck = makeDeckWithIssues();
    engine.autoFix(deck);
    const roadmap = deck.slides.find(s => s.type === "roadmap");
    if (roadmap && roadmap.type === "roadmap") {
      expect(roadmap.phases[0].timeline).toBeTruthy();
    }
  });

  it("should handle a deck without fixable issues gracefully", () => {
    const storyline = generateStoryline({ topic: "Perfect Deck", slide_count: 6 });
    const deck = generateDeck({ topic: "Perfect Deck", slide_count: 6, style_id: "allen_huawei_tech", storyline });
    const engine = new AutoFixEngine();
    const result = engine.autoFix(deck);
    // Generated decks may have generic messages but the auto-fix should not crash
    expect(result.before_score).toBeGreaterThanOrEqual(0);
    expect(result.after_score).toBeGreaterThanOrEqual(result.before_score);
  });
});
