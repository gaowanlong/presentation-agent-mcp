import { Deck, Slide } from "../../schema/deck.schema.js";
import { DeckPatch } from "../../patch/deck-patch.schema.js";
import { ReviewIssue } from "../../schema/review.schema.js";
import { FixStrategy } from "../fix-strategy.js";
import { generateId } from "../../utils/ids.js";

export class GenericMessageFix implements FixStrategy {
  readonly type = "generic_message";

  canFix(issue: ReviewIssue, _deck: Deck): boolean {
    return issue.type === "generic_message" && !!issue.slide_id;
  }

  createPatch(issue: ReviewIssue, deck: Deck): DeckPatch {
    const slide = deck.slides.find((s) => s.slide_id === issue.slide_id);
    if (!slide) throw new Error(`Slide ${issue.slide_id} not found`);
    const s = slide as any;

    let newMessage: string;
    switch (s.type as string) {
      case "insight":
        if (s.key_points?.length > 0) {
          const kp = s.key_points[0];
          newMessage = kp.length > 100 ? kp.substring(0, 97) + "…" : kp;
        } else {
          newMessage = "Key insight and analysis";
        }
        break;
      case "comparison":
        newMessage = `Comparison: ${s.left?.title || "A"} vs ${s.right?.title || "B"}`;
        break;
      case "architecture":
        newMessage = `Architecture: ${(s.layers?.length || 0)} layers`;
        break;
      case "roadmap":
        newMessage = `Roadmap: ${(s.phases?.length || 0)} phases`;
        break;
      case "timeline":
        newMessage = `Timeline: ${(s.events?.length || 0)} events`;
        break;
      case "case_study":
        newMessage = `Case study: ${(s.context || "").substring(0, 60)}`;
        break;
      case "summary":
        newMessage = `Summary: ${(s.takeaways?.length || 0)} takeaways`;
        break;
      case "agenda":
        newMessage = `Agenda: ${(s.items?.length || 0)} topics`;
        break;
      default:
        newMessage = slide.message || slide.title;
    }

    return {
      patch_id: generateId("patch"),
      deck_id: deck.deck_id,
      description: `Auto-fix: generic_message on ${issue.slide_id}`,
      old_version: deck.version,
      new_version: deck.version + 1,
      operations: [
        { op: "update_slide_fields" as const, slide_id: issue.slide_id!, fields: { message: newMessage } },
      ],
      created_at: new Date().toISOString(),
    };
  }
}
