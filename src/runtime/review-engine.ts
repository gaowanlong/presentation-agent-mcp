import { Deck, Slide } from "../schema/deck.schema.js";
import { ReviewResult, ReviewIssue } from "../schema/review.schema.js";
import { getStyleById } from "../styles/index.js";

const GENERIC_MESSAGE_PATTERNS = [
  /关于.+的技术洞察/,
  /本次汇报内容概览/,
  /当前.+的核心背景与行业趋势/,
  /传统方案与新方案的关键差异/,
  /核心结论与后续行动计划/,
];

const WEAK_TITLE_PATTERNS = [
  /^标题$/,
  /^title$/i,
  /^slide$/i,
  /^untitled$/i,
  /^新幻灯片$/,
  /^.{1,2}$/,  // 1 or 2 chars
];

export class ReviewEngine {
  review(deck: Deck): ReviewResult {
    const style = getStyleById(deck.style_id);
    const issues: ReviewIssue[] = [];
    const suggestions: string[] = [];
    let score = 100;

    // ── Deck-level checks ────────────────────────────────────────────

    if (!deck.slides.some((s) => s.type === "agenda")) {
      issues.push({ severity: "high", type: "missing_agenda", message: "Deck is missing an agenda slide" });
      score -= 15;
      suggestions.push("Add an agenda slide at the beginning of the deck");
    }
    if (!deck.slides.some((s) => s.type === "summary")) {
      issues.push({ severity: "high", type: "missing_summary", message: "Deck is missing a summary slide" });
      score -= 15;
      suggestions.push("Add a summary slide at the end of the deck");
    }

    // ── Cross-slide checks ───────────────────────────────────────────

    const msgs = deck.slides.map((s) => ({ id: s.slide_id, msg: s.message }));
    for (let i = 0; i < msgs.length; i++) {
      for (let j = i + 1; j < msgs.length; j++) {
        const mi = msgs[i].msg;
        const mj = msgs[j].msg;
        if (mi && mj && mi === mj) {
          issues.push({
            slide_id: msgs[j].id,
            severity: "low",
            type: "duplicate_slide_message",
            message: `Slide "${msgs[j].id}" has the same message as slide "${msgs[i].id}"`,
          });
          score -= 3;
        }
      }
    }

    // ── Per-slide checks ─────────────────────────────────────────────

    for (const slide of deck.slides) {
      const slideIssues = this.reviewSlide(slide, style, deck.slides);
      issues.push(...slideIssues);
    }

    // ── Score calculation ────────────────────────────────────────────

    for (const issue of issues) {
      if (issue.severity === "high") score -= 15;
      else if (issue.severity === "medium") score -= 8;
      else score -= 3;
    }
    score = Math.max(0, score);

    if (score < 70) suggestions.push("Consider reducing content density across slides");
    if (score >= 90) suggestions.push("Overall deck structure looks good!");

    return { deck_id: deck.deck_id, score, issues, suggestions: [...new Set(suggestions)] };
  }

  private reviewSlide(slide: Slide, style: any, allSlides: Slide[]): ReviewIssue[] {
    const issues: ReviewIssue[] = [];

    // ── Title checks ─────────────────────────────────────────────────

    if (slide.title.length > style.rules.title_max_chars_zh) {
      issues.push({ slide_id: slide.slide_id, severity: "medium", type: "title_too_long",
        message: `Title "${slide.title}" is ${slide.title.length} chars (max ${style.rules.title_max_chars_zh})` });
    }

    if (WEAK_TITLE_PATTERNS.some((p) => p.test(slide.title.trim()))) {
      issues.push({ slide_id: slide.slide_id, severity: "medium", type: "weak_title",
        message: `Title "${slide.title}" is too short or generic` });
    }

    // ── Message checks ───────────────────────────────────────────────

    const gMsg = slide.message;
    if (gMsg && GENERIC_MESSAGE_PATTERNS.some((p) => p.test(gMsg))) {
      issues.push({ slide_id: slide.slide_id, severity: "medium", type: "generic_message",
        message: `Message "${gMsg!.substring(0, 50)}" appears to be a generic/placeholder message` });
    }

    // ── Type-specific checks ─────────────────────────────────────────

    switch (slide.type) {
      case "insight": {
        const bp = slide.key_points?.length || 0;
        if (bp > style.rules.max_bullets_per_slide) {
          issues.push({ slide_id: slide.slide_id, severity: "medium", type: "too_many_bullets",
            message: `Slide has ${bp} key points (max ${style.rules.max_bullets_per_slide})` });
        }
        const totalChars = slide.key_points?.join("").length || 0;
        if (totalChars > style.rules.max_body_chars_per_slide) {
          issues.push({ slide_id: slide.slide_id, severity: "medium", type: "text_too_dense",
            message: `Slide has ${totalChars} chars (max ${style.rules.max_body_chars_per_slide})` });
        }
        if (!slide.key_points || slide.key_points.length === 0) {
          issues.push({ slide_id: slide.slide_id, severity: "high", type: "empty_slide",
            message: "Insight slide has no key points" });
        }
        // NEW: missing_evidence_for_claim
        if (slide.key_points && slide.key_points.length > 0 && (!slide.evidence || slide.evidence.length === 0)) {
          issues.push({ slide_id: slide.slide_id, severity: "low", type: "missing_evidence_for_claim",
            message: "Insight slide has key points but no evidence to support them" });
        }
        break;
      }

      case "comparison": {
        const l = slide.left?.points?.length || 0;
        const r = slide.right?.points?.length || 0;
        if (Math.abs(l - r) > 1) {
          issues.push({ slide_id: slide.slide_id, severity: "medium", type: "unbalanced_comparison",
            message: `Comparison has ${l} left vs ${r} right points` });
        }
        break;
      }

      case "architecture": {
        if ((slide.layers?.length || 0) > 5) {
          issues.push({ slide_id: slide.slide_id, severity: "medium", type: "too_many_architecture_layers",
            message: `Architecture has ${slide.layers?.length} layers (recommend ≤ 5)` });
        }
        if (!slide.layers?.length) {
          issues.push({ slide_id: slide.slide_id, severity: "high", type: "empty_slide",
            message: "Architecture slide has no layers" });
        }
        break;
      }

      case "roadmap": {
        if (!slide.phases?.length) {
          issues.push({ slide_id: slide.slide_id, severity: "high", type: "empty_slide",
            message: "Roadmap slide has no phases" });
        }
        if ((slide.phases?.length || 0) > 5) {
          issues.push({ slide_id: slide.slide_id, severity: "low", type: "too_many_architecture_layers",
            message: `Roadmap has ${slide.phases?.length} phases (max 5 recommended)` });
        }
        // NEW: roadmap_without_timeframe
        if (slide.phases && slide.phases.length > 0 && slide.phases.every((p: any) => !p.timeline)) {
          issues.push({ slide_id: slide.slide_id, severity: "medium", type: "roadmap_without_timeframe",
            message: "Roadmap phases have no timeline specified" });
        }
        break;
      }

      case "timeline": {
        if (!slide.events?.length) {
          issues.push({ slide_id: slide.slide_id, severity: "high", type: "empty_slide",
            message: "Timeline slide has no events" });
        }
        break;
      }

      case "case_study": {
        if (!slide.results?.length && !slide.metrics?.length) {
          issues.push({ slide_id: slide.slide_id, severity: "low", type: "weak_message",
            message: "Case study slide lacks results or metrics" });
        }
        // NEW: case_study_without_implication
        if (slide.results && slide.results.length > 0) {
          const hasImplication = slide.results.some(
            (r: string) => r.includes("提升") || r.includes("降低") || r.includes("优化") || r.includes("增强")
          );
          if (!hasImplication) {
            issues.push({ slide_id: slide.slide_id, severity: "low", type: "case_study_without_implication",
              message: "Case study results lack quantitative implications" });
          }
        }
        break;
      }

      case "title":
      case "agenda":
      case "summary":
        break;
    }

    return issues;
  }
}
