import { Deck } from "../schema/deck.schema.js";
import { DeckPatch } from "../patch/deck-patch.schema.js";
import { ReviewIssue } from "../schema/review.schema.js";

export interface FixStrategy {
  /** The IssueType this strategy can fix. */
  readonly type: string;

  /** Whether this strategy can fix the given issue. */
  canFix(issue: ReviewIssue, deck: Deck): boolean;

  /**
   * Create a DeckPatch that fixes the issue.
   * Called after canFix returns true.
   */
  createPatch(issue: ReviewIssue, deck: Deck): DeckPatch;
}
