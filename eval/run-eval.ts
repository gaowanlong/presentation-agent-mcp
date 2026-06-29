import * as fs from "node:fs";
import * as path from "node:path";
import { PresentationRuntime } from "../src/runtime/presentation-runtime.js";
import { LayoutEngine } from "../src/layout/layout-engine.js";
import { ReviewEngine } from "../src/runtime/review-engine.js";
import { IncrementalEditor } from "../src/runtime/incremental-editor.js";
import { PatchEngine } from "../src/patch/patch-engine.js";
import { RuleBasedLLMClient } from "../src/llm/rule-based-client.js";
import { PptxExporter } from "../src/export/pptx-exporter.js";
import { PdfExporter } from "../src/export/pdf-exporter.js";
import { LocalArtifactStore } from "../src/storage/local-artifact-store.js";

interface EvalCase {
  name: string;
  topic: string;
  audience?: string;
  purpose?: string;
  research_brief_file?: string;
  slide_count: number;
  style_id: string;
  metrics: {
    required_slide_types?: string[];
    required_keywords?: string[];
    min_review_score_before_autofix?: number;
    min_review_score_after_autofix?: number;
    max_duplicate_titles?: number;
    has_architecture_slide?: boolean;
    has_summary_slide?: boolean;
  };
}

interface EvalResult {
  case_name: string;
  passed: boolean;
  skipped: boolean;
  score_before: number;
  score_after: number;
  slide_count: number;
  metrics: { name: string; passed: boolean; detail: string }[];
  errors: string[];
  export_path?: string;
}

const DATA_DIR = path.resolve(process.cwd(), "data", "eval");

async function main() {
  const casesDir = path.resolve(process.cwd(), "eval", "cases");
  const caseFiles = fs.readdirSync(casesDir).filter((f) => f.endsWith(".json"));

  const store = new LocalArtifactStore();
  const layoutEngine = new LayoutEngine();
  const reviewEngine = new ReviewEngine();
  const patchEngine = new PatchEngine();
  const llmClient = new RuleBasedLLMClient();
  const editor = new IncrementalEditor(reviewEngine, patchEngine, llmClient);
  const pptxExp = new PptxExporter(layoutEngine);
  const pdfExp = new PdfExporter(layoutEngine);
  const rt = new PresentationRuntime(store, layoutEngine, reviewEngine, editor, pptxExp, pdfExp);

  const results: EvalResult[] = [];
  let passed = 0, failed = 0;

  for (const caseFile of caseFiles) {
    const casePath = path.join(casesDir, caseFile);
    const caseDef: EvalCase = JSON.parse(fs.readFileSync(casePath, "utf-8"));
    const result: EvalResult = {
      case_name: caseDef.name,
      passed: true, skipped: false,
      score_before: 0, score_after: 0,
      slide_count: 0,
      metrics: [],
      errors: [],
    };

    console.error(`\n=== [${caseDef.name}] ===`);

    try {
      // Read research brief if specified
      let research_brief: string | undefined;
      if (caseDef.research_brief_file) {
        const briefPath = path.resolve(caseDef.research_brief_file);
        if (fs.existsSync(briefPath)) {
          research_brief = fs.readFileSync(briefPath, "utf-8").substring(0, 3000);
          console.error(`  Research brief loaded (${research_brief.length} chars)`);
        } else {
          console.error(`  WARNING: Research brief file not found: ${briefPath}`);
        }
      }

      // 1. create_deck
      console.error("  create_deck...");
      const deck = await rt.createDeck({
        topic: caseDef.topic,
        audience: caseDef.audience,
        purpose: caseDef.purpose,
        research_brief,
        slide_count: caseDef.slide_count,
        style_id: caseDef.style_id,
      });
      result.slide_count = deck.slides.length;
      console.error(`  Slides: ${deck.slides.length} (${deck.slides.map(s => s.type).join(", ")})`);

      // 2. review_deck
      console.error("  review_deck...");
      const beforeReview = reviewEngine.review(deck);
      result.score_before = beforeReview.score;
      console.error(`  Score before: ${beforeReview.score} (${beforeReview.issues.length} issues)`);

      // Validate pre-autofix metrics
      result.metrics.push(...validateMetrics(caseDef, deck, beforeReview, false));

      // 3. auto_fix_deck
      console.error("  auto_fix_deck...");
      const fixResult = await rt.autoFixDeck(deck.deck_id);
      const fixedDeck = await rt.getDeck(deck.deck_id);
      const afterReview = reviewEngine.review(fixedDeck);
      result.score_after = afterReview.score;
      console.error(`  Score after: ${afterReview.score} (${afterReview.issues.length} issues, patches: ${fixResult.patches.length})`);

      // Validate post-autofix metrics
      result.metrics.push(...validateMetrics(caseDef, fixedDeck, afterReview, true));

      // 4. export_pptx
      console.error("  export_pptx...");
      const exp = await rt.exportPptx(deck.deck_id);
      result.export_path = exp.file_path;
      const size = fs.statSync(exp.file_path).size;
      console.error(`  PPTX: ${exp.file_path} (${size} bytes)`);
    } catch (err: any) {
      console.error(`  ERROR: ${err.message}`);
      result.errors.push(err.message);
      result.passed = false;
    }

    // Final pass/fail
    const failedMetrics = result.metrics.filter((m) => !m.passed);
    if (failedMetrics.length > 0 || result.errors.length > 0) {
      result.passed = false;
    }
    if (result.passed) passed++; else failed++;
    results.push(result);
  }

  // ── Report ─────────────────────────────────────────────────────
  console.error("\n" + "=".repeat(60));
  console.error("EVAL REPORT");
  console.error("=".repeat(60));

  let total = 0, totalMetrics = 0, passedMetrics = 0;
  for (const r of results) {
    total++;
    const status = r.passed ? "PASS" : "FAIL";
    const metricSummary = `${r.metrics.filter(m => m.passed).length}/${r.metrics.length} metrics`;
    console.error(`  [${status}] ${r.case_name}: score ${r.score_before}→${r.score_after}, ${metricSummary}`);
    if (r.export_path) console.error(`         PPTX: ${r.export_path}`);
    if (r.errors.length > 0) console.error(`         Errors: ${r.errors.join(", ")}`);
    for (const m of r.metrics) {
      totalMetrics++;
      if (m.passed) passedMetrics++;
      if (!m.passed) console.error(`         ✗ ${m.name}: ${m.detail}`);
    }
  }

  console.error(`\nResults: ${passed}/${total} passed`);
  console.error(`Metrics: ${passedMetrics}/${totalMetrics} passed`);
  console.error(`Evaluation complete.\n`);
}

function validateMetrics(
  caseDef: EvalCase,
  deck: any,
  review: any,
  afterAutoFix: boolean
): { name: string; passed: boolean; detail: string }[] {
  const metrics: { name: string; passed: boolean; detail: string }[] = [];
  const m = caseDef.metrics;

  // required_slide_types
  if (m.required_slide_types && !afterAutoFix) {
    const types = deck.slides.map((s: any) => s.type);
    const missing = m.required_slide_types.filter((t) => !types.includes(t));
    metrics.push({
      name: "required_slide_types",
      passed: missing.length === 0,
      detail: missing.length > 0 ? `Missing: ${missing.join(", ")}` : "All present",
    });
  }

  // required_keywords
  if (m.required_keywords && !afterAutoFix) {
    const allText = JSON.stringify(deck).toLowerCase();
    const missing = m.required_keywords.filter((kw) => !allText.includes(kw.toLowerCase()));
    metrics.push({
      name: "required_keywords",
      passed: missing.length === 0,
      detail: missing.length > 0 ? `Missing: ${missing.join(", ")}` : "All present",
    });
  }

  // has_architecture_slide
  if (m.has_architecture_slide !== undefined && !afterAutoFix) {
    const has = deck.slides.some((s: any) => s.type === "architecture");
    metrics.push({
      name: "has_architecture_slide",
      passed: has === m.has_architecture_slide,
      detail: has ? "Present" : "Missing",
    });
  }

  // has_summary_slide
  if (m.has_summary_slide !== undefined && !afterAutoFix) {
    const has = deck.slides.some((s: any) => s.type === "summary");
    metrics.push({
      name: "has_summary_slide",
      passed: has === m.has_summary_slide,
      detail: has ? "Present" : "Missing",
    });
  }

  // min_review_score_before_autofix
  if (m.min_review_score_before_autofix !== undefined && !afterAutoFix) {
    metrics.push({
      name: "min_review_score_before_autofix",
      passed: review.score >= m.min_review_score_before_autofix,
      detail: `Score: ${review.score} (min: ${m.min_review_score_before_autofix})`,
    });
  }

  // min_review_score_after_autofix
  if (m.min_review_score_after_autofix !== undefined && afterAutoFix) {
    metrics.push({
      name: "min_review_score_after_autofix",
      passed: review.score >= m.min_review_score_after_autofix,
      detail: `Score: ${review.score} (min: ${m.min_review_score_after_autofix})`,
    });
  }

  // max_duplicate_titles
  if (m.max_duplicate_titles !== undefined && !afterAutoFix) {
    const titles = deck.slides.map((s: any) => s.title);
    const dupes = titles.filter((t: string, i: number) => titles.indexOf(t) !== i);
    metrics.push({
      name: "max_duplicate_titles",
      passed: dupes.length <= (m.max_duplicate_titles || 0),
      detail: `Duplicates: ${dupes.length} (max: ${m.max_duplicate_titles}) — ${dupes.join(", ") || "none"}`,
    });
  }

  return metrics;
}

main().catch((err) => {
  console.error("EVAL FAILED:", err);
  process.exit(1);
});
