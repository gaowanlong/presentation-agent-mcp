import { Deck } from "../../schema/deck.schema.js";
import { DeckPatch } from "../../patch/deck-patch.schema.js";
import { ReviewIssue } from "../../schema/review.schema.js";
import { FixStrategy } from "../fix-strategy.js";
import { generateId } from "../../utils/ids.js";

export class RoadmapWithoutTimeframeFix implements FixStrategy {
  readonly type = "roadmap_without_timeframe";

  canFix(issue: ReviewIssue, _deck: Deck): boolean {
    return issue.type === "roadmap_without_timeframe" && !!issue.slide_id;
  }

  createPatch(issue: ReviewIssue, deck: Deck): DeckPatch {
    const slide = deck.slides.find((s) => s.slide_id === issue.slide_id);
    if (!slide) throw new Error(`Slide ${issue.slide_id} not found`);
    if (slide.type !== "roadmap") throw new Error("Expected roadmap slide");

    const now = new Date().toISOString();
    const defaultTimelines = ["Q1", "Q2", "Q3", "Q4", "H1", "H2"];
    const updatedPhases = slide.phases.map((p: any, i: number) => ({
      ...p,
      timeline: p.timeline || defaultTimelines[i % defaultTimelines.length],
    }));

    return {
      patch_id: generateId("patch"),
      deck_id: deck.deck_id,
      description: `Auto-fix: roadmap_without_timeframe on ${issue.slide_id}`,
      old_version: deck.version,
      new_version: deck.version + 1,
      operations: [
        { op: "update_slide_fields" as const, slide_id: issue.slide_id!, fields: { phases: updatedPhases } },
      ],
      created_at: now,
    };
  }
}
