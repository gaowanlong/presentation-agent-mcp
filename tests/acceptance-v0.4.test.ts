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
import { ReviewEngine as RE } from "../src/runtime/review-engine.js";

describe("V0.4 Acceptance", () => {
  async function makeRuntime() {
    const store = new LocalArtifactStore();
    const layoutEngine = new LayoutEngine();
    const reviewEngine = new ReviewEngine();
    const patchEngine = new PatchEngine();
    const llmClient = new RuleBasedLLMClient();
    const editor = new IncrementalEditor(reviewEngine, patchEngine, llmClient);
    const rt = new PresentationRuntime(store, layoutEngine, reviewEngine, editor, new PptxExporter(layoutEngine));
    return { rt, store, reviewEngine };
  }

  it("auto_fix_deck should improve score from 38 to 60+", async () => {
    const { rt, reviewEngine } = await makeRuntime();
    const deck = await rt.createDeck({ topic: "Acceptance Test", slide_count: 8, style_id: "allen_huawei_tech" });

    // Verify baseline
    const before = reviewEngine.review(deck);
    expect(before.score).toBeLessThan(60); // Should have issues

    // Run auto-fix
    const result = await rt.autoFixDeck(deck.deck_id);
    expect(result.patches.length).toBeGreaterThan(0);

    // Verify improvement
    const afterDeck = await rt.getDeck(deck.deck_id);
    const after = reviewEngine.review(afterDeck);
    expect(after.score).toBeGreaterThanOrEqual(60);
    expect(after.score).toBeGreaterThan(before.score);
  });

  it("research brief should be ingested into storyline", async () => {
    const brief = "端侧AI负载正从推理向Agent演进。NPU prefill延迟比CPU低18倍。建议重构内核资源管理抽象。";
    const storytline = await (await makeRuntime()).rt.createStoryline({ topic: "端侧OS", research_brief: brief, slide_count: 6 });
    expect(storytline.sections.length).toBe(6);
    // Research data should influence section messages
    const bgSection = storytline.sections[2];
    expect(bgSection.title).toBe("背景与趋势");
  });
});
