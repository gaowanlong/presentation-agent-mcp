import { describe, it, expect } from "vitest";
import { PresentationRuntime } from "../src/runtime/presentation-runtime.js";
import { LayoutEngine } from "../src/layout/layout-engine.js";
import { ReviewEngine } from "../src/runtime/review-engine.js";
import { IncrementalEditor } from "../src/runtime/incremental-editor.js";
import { PatchEngine } from "../src/patch/patch-engine.js";
import { RuleBasedLLMClient } from "../src/llm/rule-based-client.js";
import { PptxExporter } from "../src/export/pptx-exporter.js";
import { PdfExporter } from "../src/export/pdf-exporter.js";
import { LocalArtifactStore } from "../src/storage/local-artifact-store.js";

describe("Full workflow E2E", () => {
  async function makeRuntime() {
    const store = new LocalArtifactStore();
    const layoutEngine = new LayoutEngine();
    const reviewEngine = new ReviewEngine();
    const patchEngine = new PatchEngine();
    const llmClient = new RuleBasedLLMClient();
    const editor = new IncrementalEditor(reviewEngine, patchEngine, llmClient);
    const pptxExp = new PptxExporter(layoutEngine);
    const pdfExp = new PdfExporter(layoutEngine);
    const rt = new PresentationRuntime(store, layoutEngine, reviewEngine, editor, pptxExp, pdfExp);
    return { rt, store };
  }

  it("create_deck → review_deck → export_pptx → export_pdf → update_slide ×2 → list_patches → export_pptx", async () => {
    const { rt, store } = await makeRuntime();

    // 1. create_deck
    const deck = await rt.createDeck({
      topic: "E2E Workflow Test",
      audience: "Developers",
      purpose: "Testing the full workflow",
      slide_count: 8,
      style_id: "allen_huawei_tech",
    });
    expect(deck.slides.length).toBe(8);
    expect(deck.version).toBe(1);

    // 2. review_deck
    const review = await rt.reviewDeck(deck.deck_id);
    expect(review.score).toBeGreaterThanOrEqual(0);
    expect(review.issues.length).toBeGreaterThanOrEqual(0);

    // 3. export_pptx
    const pptx = await rt.exportPptx(deck.deck_id);
    expect(pptx.format).toBe("pptx");
    expect(pptx.file_path).toMatch(/\.pptx$/);

    // 4. export_pdf
    const pdf = await rt.exportPdf(deck.deck_id);
    expect(pdf.format).toBe("pdf");
    expect(pdf.file_path).toMatch(/\.pdf$/);

    // 5. update_slide to comparison
    const up1 = await rt.updateSlide({
      deck_id: deck.deck_id,
      slide_id: deck.slides[4].slide_id,
      instruction: "改成对比：突出调度、内存、IO、安全四个维度",
    });
    expect(up1.new_version).toBe(2);
    expect(up1.updated_slide.type).toBe("comparison");
    expect(up1.patch_id).toMatch(/^patch_/);

    // 6. update_slide to roadmap
    const up2 = await rt.updateSlide({
      deck_id: deck.deck_id,
      slide_id: deck.slides[5].slide_id,
      instruction: "改成演进路线图，包含三个阶段",
    });
    expect(up2.new_version).toBe(3);
    expect(up2.updated_slide.type).toBe("roadmap");

    // 7. list_patches
    const patches = await rt.listPatches(deck.deck_id);
    expect(patches.length).toBe(2);
    expect(patches[0].old_version).toBe(1);
    expect(patches[0].new_version).toBe(2);
    expect(patches[1].old_version).toBe(2);
    expect(patches[1].new_version).toBe(3);

    // 8. export_pptx again
    const pptx2 = await rt.exportPptx(deck.deck_id);
    expect(pptx2.file_path).toMatch(/\.pptx$/);
    expect(pptx2.export_id).not.toBe(pptx.export_id);
  });
});
