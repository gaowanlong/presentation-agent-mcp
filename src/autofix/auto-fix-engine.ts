import { Deck } from "../schema/deck.schema.js";
import { ReviewResult, ReviewIssue } from "../schema/review.schema.js";
import { ReviewEngine } from "../runtime/review-engine.js";
import { PatchEngine } from "../patch/patch-engine.js";
import { DeckPatch } from "../patch/deck-patch.schema.js";
import { FixStrategy } from "./fix-strategy.js";
import { WeakTitleFix } from "./fixes/weak-title.fix.js";
import { TitleTooLongFix } from "./fixes/title-too-long.fix.js";
import { TooManyBulletsFix } from "./fixes/too-many-bullets.fix.js";
import { MissingSummaryFix } from "./fixes/missing-summary.fix.js";
import { RoadmapWithoutTimeframeFix } from "./fixes/roadmap-without-timeframe.fix.js";
import { GenericMessageFix } from "./fixes/generic-message.fix.js";

export interface AutoFixResult {
  deck_id: string;
  before_score: number;
  after_score: number;
  improvements: { issue: string; fixed: boolean; patch_id?: string }[];
  patches: DeckPatch[];
}

export class AutoFixEngine {
  private strategies: FixStrategy[];
  private patchEngine: PatchEngine;
  private reviewEngine: ReviewEngine;

  constructor() {
    this.patchEngine = new PatchEngine();
    this.reviewEngine = new ReviewEngine();
    this.strategies = [
      new WeakTitleFix(),
      new TitleTooLongFix(),
      new TooManyBulletsFix(),
      new MissingSummaryFix(),
      new RoadmapWithoutTimeframeFix(),
      new GenericMessageFix(),
    ];
  }

  autoFix(deck: Deck): AutoFixResult {
    const beforeReview = this.reviewEngine.review(deck);
    const improvements: AutoFixResult["improvements"] = [];
    const appliedPatches: DeckPatch[] = [];

    for (const issue of beforeReview.issues) {
      const strategy = this.strategies.find((s) => s.type === issue.type && s.canFix(issue, deck));
      if (!strategy) {
        improvements.push({ issue: issue.type, fixed: false });
        continue;
      }

      try {
        const patch = strategy.createPatch(issue, deck);
        this.patchEngine.applyPatch(deck, patch);
        appliedPatches.push(patch);
        improvements.push({ issue: issue.type, fixed: true, patch_id: patch.patch_id });
      } catch (err: any) {
        console.error(`[AutoFix] Failed to fix ${issue.type}: ${err.message}`);
        improvements.push({ issue: issue.type, fixed: false });
      }
    }

    const afterReview = this.reviewEngine.review(deck);

    return {
      deck_id: deck.deck_id,
      before_score: beforeReview.score,
      after_score: afterReview.score,
      improvements,
      patches: appliedPatches,
    };
  }
}
