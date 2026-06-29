import type { Deck, InsightSlide } from "../../src/schema/deck.schema.js";

export function insightSlide(keyPoints: string[], id = "slide-1"): InsightSlide {
  return { slide_id: id, type: "insight", title: `Insight ${id}`, key_points: keyPoints };
}

export function deckWithInsights(keyPointSets: string[][]): Deck {
  return {
    deck_id: "deck-quality", version: 1, title: "Quality Test", topic: "Quality Test",
    style_id: "allen_huawei_tech",
    slides: keyPointSets.map((points, i) => insightSlide(points, `slide-${i + 1}`)),
    created_at: "2026-06-30T00:00:00.000Z", updated_at: "2026-06-30T00:00:00.000Z",
  };
}
