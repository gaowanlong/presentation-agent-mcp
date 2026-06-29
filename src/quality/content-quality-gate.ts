import { Deck } from "../schema/deck.schema.js";
import { ReviewResult, ReviewIssue } from "../schema/review.schema.js";

export class ContentQualityGate {
  validate(deck: Deck): ReviewResult {
    const issues: ReviewIssue[] = [];
    let score = 100;

    // Check duplicate content across slides
    const allContent = deck.slides.flatMap(s =>
      s.type === "insight" ? (s.key_points || []) : [s.title]
    );
    const seen = new Set<string>();
    for (const content of allContent) {
      if (seen.has(content)) {
        issues.push({ type: "duplicate_slide_content", severity: "high", message: "Duplicate content: " + content.substring(0, 40) });
        score -= 15;
      }
      seen.add(content);
    }

    // Check unsupported numeric claims
    const numPattern = /\d+%|\d+\s*TPS|\d+\.\d+\s*[xX]/;
    for (const slide of deck.slides) {
      if (slide.type === "insight" && slide.key_points) {
        for (const kp of slide.key_points) {
          if (numPattern.test(kp) && !kp.includes("source") && !kp.includes("报告")) {
            issues.push({ type: "unsupported_numeric_claim", severity: "high", message: "Unsupported claim: " + kp.substring(0, 50) });
            score -= 15;
          }
        }
      }
    }

    return { deck_id: deck.deck_id, score: Math.max(0, score), issues, suggestions: [] };
  }
}
