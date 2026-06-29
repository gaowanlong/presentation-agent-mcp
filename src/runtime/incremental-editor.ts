import { Deck, Slide } from "../schema/deck.schema.js";
import { ReviewResult } from "../schema/review.schema.js";
import { ReviewEngine } from "./review-engine.js";
import { generateId } from "../utils/ids.js";
import { PatchEngine } from "../patch/patch-engine.js";
import { DeckPatch, PatchOperation } from "../patch/deck-patch.schema.js";
import { LLMClient } from "../llm/llm-client.js";

export interface UpdateSlideInput {
  deck_id: string; slide_id: string; instruction: string;
}

export interface UpdateSlideResult {
  deck_id: string; old_version: number; new_version: number;
  patch_id: string;
  operations: { op: string; slide_id?: string }[];
  updated_slide: Slide;
  review: ReviewResult;
  patch: DeckPatch;
}

export class IncrementalEditor {
  constructor(
    private reviewEngine: ReviewEngine,
    private patchEngine: PatchEngine,
    private llmClient: LLMClient
  ) {}

  async updateSlide(deck: Deck, input: UpdateSlideInput): Promise<UpdateSlideResult> {
    const slideIndex = deck.slides.findIndex((s) => s.slide_id === input.slide_id);
    if (slideIndex === -1) throw new Error(`Slide "${input.slide_id}" not found in deck "${input.deck_id}"`);

    const oldSlide = deck.slides[slideIndex];
    // ← 生成逻辑通过 LLMClient 入口
    const newSlide = await this.llmClient.generatePatch(oldSlide, input.instruction, deck.topic);

    const oldVersion = deck.version;
    const newVersion = oldVersion + 1;
    const patchId = generateId("patch");
    const now = new Date().toISOString();

    const patch: DeckPatch = {
      patch_id: patchId, deck_id: deck.deck_id,
      description: `update_slide: ${input.instruction.substring(0, 80)}`,
      old_version: oldVersion, new_version: newVersion,
      operations: [{ op: "replace_slide", slide_id: input.slide_id, slide: newSlide as unknown as Record<string, unknown> }],
      created_at: now,
    };

    this.patchEngine.applyPatch(deck, patch);
    const review = this.reviewEngine.review(deck);

    return {
      deck_id: deck.deck_id, old_version: oldVersion, new_version: newVersion,
      patch_id: patchId,
      operations: patch.operations.map((op) => ({ op: op.op, slide_id: (op as any).slide_id })),
      updated_slide: newSlide, review, patch,
    };
  }

  createPatch(deck: Deck, operations: PatchOperation[], description?: string): DeckPatch {
    return {
      patch_id: generateId("patch"), deck_id: deck.deck_id,
      description: description || "Patch",
      old_version: deck.version, new_version: deck.version + 1,
      operations, created_at: new Date().toISOString(),
    };
  }

  applyPatch(deck: Deck, patch: DeckPatch): void {
    this.patchEngine.applyPatch(deck, patch);
  }
}
