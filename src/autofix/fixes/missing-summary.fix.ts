import { Deck } from "../../schema/deck.schema.js";
import { DeckPatch } from "../../patch/deck-patch.schema.js";
import { ReviewIssue } from "../../schema/review.schema.js";
import { FixStrategy } from "../fix-strategy.js";
import { generateId } from "../../utils/ids.js";

export class MissingSummaryFix implements FixStrategy {
  readonly type = "missing_summary";

  canFix(issue: ReviewIssue, deck: Deck): boolean {
    return issue.type === "missing_summary";
  }

  createPatch(issue: ReviewIssue, deck: Deck): DeckPatch {
    const now = new Date().toISOString();
    return {
      patch_id: generateId("patch"),
      deck_id: deck.deck_id,
      description: "Auto-fix: missing_summary",
      old_version: deck.version,
      new_version: deck.version + 1,
      operations: [
        {
          op: "insert_slide" as const,
          slide: {
            slide_id: generateId("s"),
            type: "summary",
            title: "Summary & Next Steps",
            takeaways: ["Key findings presented in this deck", "Action items identified"],
            next_steps: ["Review and prioritize", "Assign owners", "Set timelines"],
          },
        },
      ],
      created_at: now,
    };
  }
}
