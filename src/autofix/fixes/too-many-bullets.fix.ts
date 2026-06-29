import { Deck } from "../../schema/deck.schema.js";
import { DeckPatch } from "../../patch/deck-patch.schema.js";
import { ReviewIssue } from "../../schema/review.schema.js";
import { FixStrategy } from "../fix-strategy.js";
import { getStyleById } from "../../styles/index.js";
import { generateId } from "../../utils/ids.js";

export class TooManyBulletsFix implements FixStrategy {
  readonly type = "too_many_bullets";

  canFix(issue: ReviewIssue, _deck: Deck): boolean {
    return issue.type === "too_many_bullets" && !!issue.slide_id;
  }

  createPatch(issue: ReviewIssue, deck: Deck): DeckPatch {
    const slide = deck.slides.find((s) => s.slide_id === issue.slide_id);
    if (!slide) throw new Error(`Slide ${issue.slide_id} not found`);
    if (slide.type !== "insight") throw new Error("too_many_bullets only applies to insight slides");

    const style = getStyleById(deck.style_id);
    const maxBullets = style.rules.max_bullets_per_slide;
    const truncatedPoints = slide.key_points.slice(0, maxBullets);

    const now = new Date().toISOString();
    return {
      patch_id: generateId("patch"),
      deck_id: deck.deck_id,
      description: `Auto-fix: too_many_bullets on ${issue.slide_id}`,
      old_version: deck.version,
      new_version: deck.version + 1,
      operations: [
        { op: "update_slide_fields" as const, slide_id: issue.slide_id!, fields: { key_points: truncatedPoints } },
      ],
      created_at: now,
    };
  }
}
