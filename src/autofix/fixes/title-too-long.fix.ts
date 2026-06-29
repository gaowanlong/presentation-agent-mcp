import { Deck } from "../../schema/deck.schema.js";
import { DeckPatch } from "../../patch/deck-patch.schema.js";
import { ReviewIssue } from "../../schema/review.schema.js";
import { FixStrategy } from "../fix-strategy.js";
import { getStyleById } from "../../styles/index.js";
import { generateId } from "../../utils/ids.js";

export class TitleTooLongFix implements FixStrategy {
  readonly type = "title_too_long";

  canFix(issue: ReviewIssue, _deck: Deck): boolean {
    return issue.type === "title_too_long" && !!issue.slide_id;
  }

  createPatch(issue: ReviewIssue, deck: Deck): DeckPatch {
    const slide = deck.slides.find((s) => s.slide_id === issue.slide_id);
    if (!slide) throw new Error(`Slide ${issue.slide_id} not found`);

    const style = getStyleById(deck.style_id);
    const maxLen = style.rules.title_max_chars_zh;
    let newTitle = slide.title;
    if (newTitle.length > maxLen) {
      newTitle = newTitle.substring(0, maxLen - 1) + "…";
    }

    return {
      patch_id: generateId("patch"),
      deck_id: deck.deck_id,
      description: `Auto-fix: title_too_long on ${issue.slide_id}`,
      old_version: deck.version,
      new_version: deck.version + 1,
      operations: [
        { op: "update_slide_fields" as const, slide_id: issue.slide_id!, fields: { title: newTitle } },
      ],
      created_at: new Date().toISOString(),
    };
  }
}
