import { describe, it, expect } from "vitest";
import { LayoutEngine } from "../src/layout/layout-engine.js";
import { ReviewEngine } from "../src/runtime/review-engine.js";
import { IncrementalEditor } from "../src/runtime/incremental-editor.js";
import { PatchEngine } from "../src/patch/patch-engine.js";
import { RuleBasedLLMClient } from "../src/llm/rule-based-client.js";
import { PptxExporter } from "../src/export/pptx-exporter.js";
import { generateDeck } from "../src/runtime/deck-generator.js";
import { generateStoryline } from "../src/runtime/storyline-planner.js";

describe("PptxExporter", () => {
  const layoutEngine = new LayoutEngine();
  const exporter = new PptxExporter(layoutEngine);

  it("should export a sample deck to pptx buffer", async () => {
    const storyline = generateStoryline({
      topic: "Agentic AI 时代端侧 OS 架构演进",
      audience: "技术管理层",
      purpose: "说明端侧负载变化并提出架构演进方向",
      slide_count: 6,
    });

    const deck = generateDeck({
      topic: "Agentic AI 时代端侧 OS 架构演进",
      audience: "技术管理层",
      purpose: "说明端侧负载变化并提出架构演进方向",
      slide_count: 6,
      style_id: "allen_huawei_tech",
      storyline,
    });

    const buffer = await exporter.export(deck);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it("should export a full 8-slide deck", async () => {
    const storyline = generateStoryline({
      topic: "AI Infrastructure Evolution",
      slide_count: 8,
    });

    const deck = generateDeck({
      topic: "AI Infrastructure Evolution",
      slide_count: 8,
      style_id: "allen_huawei_tech",
      storyline,
    });

    const buffer = await exporter.export(deck);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(1000);
  });

  it("should handle all slide types in export", async () => {
    const storyline = generateStoryline({
      topic: "Full Type Test",
      slide_count: 8,
    });

    const deck = generateDeck({
      topic: "Full Type Test",
      slide_count: 8,
      style_id: "default",
      storyline,
    });

    const buffer = await exporter.export(deck);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });
});

describe("Integration: Runtime flow", () => {
  const layoutEngine = new LayoutEngine();
  const reviewEngine = new ReviewEngine();
  const patchEngine = new PatchEngine();
  const llmClient = new RuleBasedLLMClient();
  const incrementalEditor = new IncrementalEditor(reviewEngine, patchEngine, llmClient);
  const exporter = new PptxExporter(layoutEngine);

  it("create_deck -> review_deck -> export_pptx should work", async () => {
    const storyline = generateStoryline({
      topic: "Integration Test Topic",
      audience: "Developers",
      purpose: "Testing the full pipeline",
      slide_count: 8,
    });

    const deck = generateDeck({
      topic: "Integration Test Topic",
      audience: "Developers",
      purpose: "Testing the full pipeline",
      slide_count: 8,
      style_id: "allen_huawei_tech",
      storyline,
    });

    expect(deck.slides.length).toBe(8);
    expect(deck.version).toBe(1);

    const review = reviewEngine.review(deck);
    expect(review.score).toBeGreaterThanOrEqual(0);
    expect(review.issues.length).toBeGreaterThanOrEqual(0);

    const buffer = await exporter.export(deck);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it("update_slide should use patch system and increment version", async () => {
    const storyline = generateStoryline({
      topic: "Edit Test",
      slide_count: 6,
    });

    const deck = generateDeck({
      topic: "Edit Test",
      slide_count: 6,
      style_id: "allen_huawei_tech",
      storyline,
    });

    const oldVersion = deck.version;
    const targetSlideId = deck.slides[4].slide_id;

    const result = await incrementalEditor.updateSlide(deck, {
      deck_id: deck.deck_id,
      slide_id: targetSlideId,
      instruction: "把这一页改成传统OS和AgentOS的对比，突出调度、内存、IO和安全四个维度",
    });

    expect(result.new_version).toBe(oldVersion + 1);
    expect(result.updated_slide.type).toBe("comparison");
    expect(result.review.score).toBeGreaterThanOrEqual(0);

    // New patch-related fields
    expect(result.patch_id).toBeTruthy();
    expect(result.operations.length).toBe(1);
    expect(result.operations[0].op).toBe("replace_slide");
    expect(result.operations[0].slide_id).toBe(targetSlideId);
    expect(result.patch).toBeTruthy();
    expect(result.patch.old_version).toBe(oldVersion);
    expect(result.patch.new_version).toBe(oldVersion + 1);
  });
});
