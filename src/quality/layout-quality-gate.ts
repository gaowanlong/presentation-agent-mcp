import { LayoutElement, TextElement } from "../schema/layout.schema.js";
import { StyleProfile } from "../schema/style.schema.js";
import { ReviewResult, ReviewIssue } from "../schema/review.schema.js";

export class LayoutQualityGate {
  validate(elements: LayoutElement[], style: StyleProfile, slideW = 13.333, slideH = 7.5): ReviewResult {
    const issues: ReviewIssue[] = [];
    let score = 100;

    for (const el of elements) {
      if (el.x + el.w > slideW + 0.01 || el.y + el.h > slideH + 0.01) {
        issues.push({ type: "unintended_overlap", severity: "high", message: "Element out of bounds" });
        score -= 15;
      }
    }

    const textEls = elements.filter((e): e is TextElement => e.kind === "text");
    for (const el of textEls) {
      if (el.color && el.font_size && el.font_size < 18) {
        const bg = style.colors.background;
        const c = this.calcContrast(el.color, bg);
        if (c < 3) {
          issues.push({ type: "weak_message", severity: "low", message: "Low contrast text" });
          score -= 3;
        }
      }
      if (el.role === "caption" && el.font_size && el.font_size < 9) {
        issues.push({ type: "weak_message", severity: "low", message: "Caption too small" });
        score -= 3;
      }
    }

    return { deck_id: "", score: Math.max(0, score), issues, suggestions: [] };
  }

  validateDeck(slides: LayoutElement[][], style: StyleProfile): { valid: boolean; issues: ReviewIssue[] } {
    const allIssues: ReviewIssue[] = [];
    for (const slideElements of slides) {
      const result = this.validate(slideElements, style);
      allIssues.push(...result.issues);
    }
    return { valid: !allIssues.some(i => i.severity === "high"), issues: allIssues };
  }

  private calcContrast(fg: string, bg: string): number {
    const l1 = this.relLum(fg);
    const l2 = this.relLum(bg);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  }

  private relLum(hex: string): number {
    const h = hex.replace("#", "").substring(0, 6);
    const [r, g, b] = [h.substring(0,2), h.substring(2,4), h.substring(4,6)].map(v => parseInt(v,16)/255);
    const [rl, gl, bl] = [r, g, b].map(v => v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4));
    return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
  }
}
