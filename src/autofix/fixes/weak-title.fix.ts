import { Deck } from "../../schema/deck.schema.js";
import { DeckPatch } from "../../patch/deck-patch.schema.js";
import { ReviewIssue } from "../../schema/review.schema.js";
import { FixStrategy } from "../fix-strategy.js";
import { generateId } from "../../utils/ids.js";

export class WeakTitleFix implements FixStrategy {
  readonly type = "weak_title";

  canFix(issue: ReviewIssue, _deck: Deck): boolean {
    return issue.type === "weak_title" && !!issue.slide_id;
  }

  createPatch(issue: ReviewIssue, deck: Deck): DeckPatch {
    const slide = deck.slides.find((s) => s.slide_id === issue.slide_id);
    if (!slide) throw new Error(`Slide ${issue.slide_id} not found`);

    let newTitle: string;
    const st: string = slide.type;
    switch (st) {
      case "title":
        newTitle = deck.title || "Presentation";
        break;
      case "agenda":
        newTitle = "Agenda";
        break;
      case "insight":
        newTitle = "Key Insight";
        break;
      case "comparison":
        newTitle = "Architecture Comparison";
        break;
      case "architecture":
        newTitle = "System Architecture";
        break;
      case "summary":
        newTitle = "Summary & Next Steps";
        break;
      case "roadmap":
        newTitle = "Roadmap";
        break;
      case "timeline":
        newTitle = "Timeline";
        break;
      case "case_study":
        newTitle = "Case Study";
        break;
      default:
        newTitle = `${st.charAt(0).toUpperCase()}${st.slice(1)}`;
    }

    const now = new Date().toISOString();
    return {
      patch_id: generateId("patch"),
      deck_id: deck.deck_id,
      description: `Auto-fix: weak_title on ${issue.slide_id}`,
      old_version: deck.version,
      new_version: deck.version + 1,
      operations: [
        { op: "update_slide_fields" as const, slide_id: issue.slide_id!, fields: { title: newTitle } },
      ],
      created_at: now,
    };
  }
}
