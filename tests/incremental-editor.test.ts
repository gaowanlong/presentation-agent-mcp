import { describe, it, expect } from "vitest";
import { IncrementalEditor } from "../src/runtime/incremental-editor.js";
import { ReviewEngine } from "../src/runtime/review-engine.js";
import { PatchEngine } from "../src/patch/patch-engine.js";
import { RuleBasedLLMClient } from "../src/llm/rule-based-client.js";
import { generateDeck } from "../src/runtime/deck-generator.js";
import { generateStoryline } from "../src/runtime/storyline-planner.js";

describe("IncrementalEditor", () => {
  const reviewEngine = new ReviewEngine();
  const patchEngine = new PatchEngine();
  const llmClient = new RuleBasedLLMClient();
  const editor = new IncrementalEditor(reviewEngine, patchEngine, llmClient);

  function makeDeck(slideCount: number = 6) {
    const storyline = generateStoryline({ topic: "Editor Test", slide_count: slideCount });
    return generateDeck({
      topic: "Editor Test",
      slide_count: slideCount,
      style_id: "allen_huawei_tech",
      storyline,
    });
  }

  describe("updateSlide", () => {
    it("should return patch_id in result", async () => {
      const deck = makeDeck();
      const result = await editor.updateSlide(deck, {
        deck_id: deck.deck_id,
        slide_id: deck.slides[2].slide_id,
        instruction: "更新这一页的技术分析",
      });
      expect(result.patch_id).toBeTruthy();
      expect(result.patch_id).toMatch(/^patch_/);
    });

    it("should return operations list with replace_slide", async () => {
      const deck = makeDeck();
      const slideId = deck.slides[2].slide_id;
      const result = await editor.updateSlide(deck, {
        deck_id: deck.deck_id,
        slide_id: slideId,
        instruction: "更新这一页的技术分析",
      });
      expect(result.operations.length).toBeGreaterThanOrEqual(1);
      expect(result.operations[0].op).toBe("replace_slide");
      expect(result.operations[0].slide_id).toBe(slideId);
    });

    it("should return full patch object in result", async () => {
      const deck = makeDeck();
      const result = await editor.updateSlide(deck, {
        deck_id: deck.deck_id,
        slide_id: deck.slides[2].slide_id,
        instruction: "把这个改成对比页，突出 A 和 B 的差异",
      });
      expect(result.patch).toBeTruthy();
      expect(result.patch.patch_id).toBe(result.patch_id);
      expect(result.patch.old_version).toBe(result.old_version);
      expect(result.patch.new_version).toBe(result.new_version);
      expect(result.patch.operations.length).toBe(1);
    });

    it("should produce a valid operation patch", async () => {
      const deck = makeDeck();
      const result = await editor.updateSlide(deck, {
        deck_id: deck.deck_id,
        slide_id: deck.slides[2].slide_id,
        instruction: "把这个改成架构图：应用层、平台层、内核层",
      });
      const op = result.patch.operations[0];
      expect(op.op).toBe("replace_slide");
      if (op.op === "replace_slide") {
        expect(op.slide_id).toBe(deck.slides[2].slide_id);
      }
    });

    it("should bump deck version by 1", async () => {
      const deck = makeDeck();
      const oldV = deck.version;
      await editor.updateSlide(deck, {
        deck_id: deck.deck_id,
        slide_id: deck.slides[2].slide_id,
        instruction: "update slide",
      });
      expect(deck.version).toBe(oldV + 1);
    });

    it("should produce a review with score >= 0", async () => {
      const deck = makeDeck();
      const result = await editor.updateSlide(deck, {
        deck_id: deck.deck_id,
        slide_id: deck.slides[2].slide_id,
        instruction: "update slide",
      });
      expect(result.review.score).toBeGreaterThanOrEqual(0);
      expect(result.review.score).toBeLessThanOrEqual(100);
    });
  });

  describe("createPatch", () => {
    it("should create a valid DeckPatch with given operations", () => {
      const deck = makeDeck();
      const patch = editor.createPatch(
        deck,
        [{ op: "replace_slide" as const, slide_id: deck.slides[0].slide_id, slide: { type: "insight", title: "X", key_points: [] } }],
        "Change title to insight"
      );
      expect(patch.patch_id).toMatch(/^patch_/);
      expect(patch.deck_id).toBe(deck.deck_id);
      expect(patch.description).toBe("Change title to insight");
      expect(patch.old_version).toBe(deck.version);
      expect(patch.new_version).toBe(deck.version + 1);
    });
  });

  describe("applyPatch", () => {
    it("should delegate to PatchEngine by mutating deck", () => {
      const deck = makeDeck();
      const oldV = deck.version;
      const patch = editor.createPatch(deck, [
        { op: "update_slide_fields" as const, slide_id: deck.slides[0].slide_id, fields: { title: "Patched" } },
      ]);
      editor.applyPatch(deck, patch);
      expect(deck.version).toBe(oldV + 1);
      expect(deck.slides[0].title).toBe("Patched");
    });
  });
});
