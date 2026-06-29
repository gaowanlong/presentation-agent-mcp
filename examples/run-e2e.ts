import * as fs from "node:fs";
import { PresentationRuntime } from "../src/runtime/presentation-runtime.js";
import { LayoutEngine } from "../src/layout/layout-engine.js";
import { ReviewEngine } from "../src/runtime/review-engine.js";
import { IncrementalEditor } from "../src/runtime/incremental-editor.js";
import { PatchEngine } from "../src/patch/patch-engine.js";
import { RuleBasedLLMClient } from "../src/llm/rule-based-client.js";
import { PptxExporter } from "../src/export/pptx-exporter.js";
import { PdfExporter } from "../src/export/pdf-exporter.js";
import { LocalArtifactStore } from "../src/storage/local-artifact-store.js";

async function main() {
  console.error("=== Presentation Agent MCP V0.2 Full E2E ===\n");

  const store = new LocalArtifactStore();
  const layoutEngine = new LayoutEngine();
  const reviewEngine = new ReviewEngine();
  const patchEngine = new PatchEngine();
  const llmClient = new RuleBasedLLMClient();
  const editor = new IncrementalEditor(reviewEngine, patchEngine, llmClient);
  const pptxExp = new PptxExporter(layoutEngine);
  const pdfExp = new PdfExporter(layoutEngine);
  const rt = new PresentationRuntime(store, layoutEngine, reviewEngine, editor, pptxExp, pdfExp);

  // 1. create_deck
  console.error("1. create_deck...");
  const deck = await rt.createDeck({ topic: "Agentic AI 时代端侧 OS 架构演进", audience: "技术管理层", purpose: "架构演进", slide_count: 8, style_id: "allen_huawei_tech" });
  console.error("   deck_id: " + deck.deck_id);
  console.error("   slides: " + deck.slides.length + " (types: " + deck.slides.map(s => s.type).join(", ") + ")");

  // 2. review
  console.error("\n2. review_deck...");
  const r1 = await rt.reviewDeck(deck.deck_id);
  console.error("   score: " + r1.score);

  // 3. export_pptx
  console.error("\n3. export_pptx...");
  const e1 = await rt.exportPptx(deck.deck_id);
  console.error("   " + e1.file_path);
  console.error("   " + fs.statSync(e1.file_path).size + " bytes");

  // 4. export_pdf
  console.error("\n4. export_pdf...");
  try {
    const pdf = await rt.exportPdf(deck.deck_id);
    console.error("   " + pdf.file_path);
    console.error("   " + fs.statSync(pdf.file_path).size + " bytes");
  } catch (e: any) {
    console.error("   skip: " + e.message);
  }

  // 5. update_slide (对比)
  console.error("\n5. update_slide (对比)...");
  const up1 = await rt.updateSlide({ deck_id: deck.deck_id, slide_id: deck.slides[4].slide_id, instruction: "改成对比：突出调度、内存、IO、安全" });
  console.error("   v" + up1.old_version + "->v" + up1.new_version + " patch=" + up1.patch_id + " type=" + up1.updated_slide.type);

  // 6. update_slide (路线图)
  console.error("\n6. update_slide (路线图)...");
  const up2 = await rt.updateSlide({ deck_id: deck.deck_id, slide_id: deck.slides[5].slide_id, instruction: "改成演进路线图，包含三个阶段" });
  console.error("   v" + up2.old_version + "->v" + up2.new_version + " type=" + up2.updated_slide.type);

  // 7. export again
  console.error("\n7. export_pptx (after updates)...");
  const e2 = await rt.exportPptx(deck.deck_id);
  console.error("   " + e2.file_path);
  console.error("   " + fs.statSync(e2.file_path).size + " bytes");

  // 8. list patches
  console.error("\n8. list patches...");
  const patches = await rt.listPatches(deck.deck_id);
  console.error("   " + patches.length + " patches");
  for (const p of patches) {
    console.error("   - v" + p.old_version + "->v" + p.new_version + " " + p.operations.length + " ops");
  }

  console.error("\n=== E2E Passed ===");
  console.error("Slides: " + deck.slides.length + ", Version: " + up2.new_version + ", Patches: " + patches.length);
}

main().catch((err) => { console.error("FAILED:", err); process.exit(1); });
