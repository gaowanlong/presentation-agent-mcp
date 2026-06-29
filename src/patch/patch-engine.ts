import { Deck, Slide, SlideSchema, DeckSchema } from "../schema/deck.schema.js";
import { getStyleById } from "../styles/index.js";
import { AppError, ErrorCodes } from "../utils/errors.js";
import { generateId } from "../utils/ids.js";
import {
  DeckPatch,
  PatchOperation,
  PatchResult,
  ReplaceSlideOp,
  UpdateSlideFieldsOp,
  InsertSlideOp,
  DeleteSlideOp,
  ApplyStyleOp,
} from "./deck-patch.schema.js";

export class PatchEngine {
  /**
   * Apply a full DeckPatch to a deck.
   * Validates all operations, applies them sequentially, bumps version,
   * and returns the result with the patch saved.
   */
  applyPatch(deck: Deck, patch: DeckPatch): PatchResult {
    // Deep clone to avoid mutating caller's object before validation
    const snapshot = JSON.parse(JSON.stringify(deck)) as Deck;

    // Validate all operations first
    for (const op of patch.operations) {
      this.validateOperation(snapshot, op);
    }

    // Execute all operations
    for (const op of patch.operations) {
      this.executeOperation(snapshot, op);
    }

    // Post-validate affected slides
    for (const op of patch.operations) {
      this.postValidateOperation(snapshot, op);
    }

    // Set version and timestamp
    snapshot.version = patch.new_version;
    snapshot.updated_at = new Date().toISOString();

    // Final schema validation
    const parsed = DeckSchema.safeParse(snapshot);
    if (!parsed.success) {
      throw new AppError(
        ErrorCodes.INVALID_DECK_SCHEMA,
        `Patch resulted in invalid deck: ${parsed.error.message}`,
        parsed.error.issues
      );
    }

    // Copy validated result back to original deck object
    Object.assign(deck, parsed.data);

    return {
      deck_id: deck.deck_id,
      patch_id: patch.patch_id,
      old_version: patch.old_version,
      new_version: patch.new_version,
      patch,
    };
  }

  /** Validate a single operation BEFORE execution. */
  private validateOperation(deck: Deck, op: PatchOperation): void {
    switch (op.op) {
      case "replace_slide":
        return this.validateReplaceSlide(deck, op);
      case "update_slide_fields":
        return this.validateUpdateFields(deck, op);
      case "insert_slide":
        return this.validateInsertSlide(deck, op);
      case "delete_slide":
        return this.validateDeleteSlide(deck, op);
      case "apply_style":
        return this.validateApplyStyle(deck, op);
    }
  }

  /** Execute a single operation (mutates deck in place). */
  private executeOperation(deck: Deck, op: PatchOperation): void {
    switch (op.op) {
      case "replace_slide":
        return this.execReplaceSlide(deck, op);
      case "update_slide_fields":
        return this.execUpdateFields(deck, op);
      case "insert_slide":
        return this.execInsertSlide(deck, op);
      case "delete_slide":
        return this.execDeleteSlide(deck, op);
      case "apply_style":
        return this.execApplyStyle(deck, op);
    }
  }

  /** Validate AFTER execution (e.g. the resulting slide passes SlideSchema). */
  private postValidateOperation(deck: Deck, op: PatchOperation): void {
    const slideId = this.getAffectedSlideId(op);
    if (slideId) {
      const slide = deck.slides.find((s) => s.slide_id === slideId);
      if (slide) {
        const parsed = SlideSchema.safeParse(slide);
        if (!parsed.success) {
          throw new AppError(
            ErrorCodes.INVALID_DECK_SCHEMA,
            `Slide "${slideId}" failed schema validation after patch: ${parsed.error.message}`,
            parsed.error.issues
          );
        }
      }
    }
  }

  private getAffectedSlideId(op: PatchOperation): string | undefined {
    switch (op.op) {
      case "replace_slide":
        return op.slide_id;
      case "update_slide_fields":
        return op.slide_id;
      case "insert_slide":
        return (op.slide as any)?.slide_id;
      default:
        return undefined;
    }
  }

  // ── ReplaceSlide ───────────────────────────────────────────────────────

  private validateReplaceSlide(deck: Deck, op: ReplaceSlideOp): void {
    this.assertSlideExists(deck, op.slide_id);
  }

  private execReplaceSlide(deck: Deck, op: ReplaceSlideOp): void {
    const idx = deck.slides.findIndex((s) => s.slide_id === op.slide_id);
    deck.slides[idx] = { ...(op.slide as any), slide_id: op.slide_id };
  }

  // ── UpdateSlideFields ───────────────────────────────────────────────────

  private validateUpdateFields(deck: Deck, op: UpdateSlideFieldsOp): void {
    this.assertSlideExists(deck, op.slide_id);
  }

  private execUpdateFields(deck: Deck, op: UpdateSlideFieldsOp): void {
    const idx = deck.slides.findIndex((s) => s.slide_id === op.slide_id);
    const current = deck.slides[idx] as any;
    for (const [key, value] of Object.entries(op.fields)) {
      if (key === "slide_id") continue;
      current[key] = value;
    }
    deck.slides[idx] = current;
  }

  // ── InsertSlide ─────────────────────────────────────────────────────────

  private validateInsertSlide(deck: Deck, op: InsertSlideOp): void {
    if (op.after_slide_id && op.before_slide_id) {
      throw new AppError(
        ErrorCodes.INVALID_TOOL_INPUT,
        "insert_slide: cannot specify both after_slide_id and before_slide_id"
      );
    }
    if (op.after_slide_id) this.assertSlideExists(deck, op.after_slide_id);
    if (op.before_slide_id) this.assertSlideExists(deck, op.before_slide_id);
  }

  private execInsertSlide(deck: Deck, op: InsertSlideOp): void {
    const newSlide = {
      ...(op.slide as any),
      slide_id: (op.slide as any)?.slide_id || generateId("s"),
    };

    let insertIndex = deck.slides.length;
    if (op.after_slide_id) {
      insertIndex = deck.slides.findIndex((s) => s.slide_id === op.after_slide_id) + 1;
    } else if (op.before_slide_id) {
      insertIndex = deck.slides.findIndex((s) => s.slide_id === op.before_slide_id);
    }
    deck.slides.splice(insertIndex, 0, newSlide);
  }

  // ── DeleteSlide ─────────────────────────────────────────────────────────

  private validateDeleteSlide(deck: Deck, op: DeleteSlideOp): void {
    this.assertSlideExists(deck, op.slide_id);
    if (deck.slides.length <= 2) {
      throw new AppError(ErrorCodes.DECK_TOO_LARGE, "delete_slide: deck must have at least 2 slides");
    }
  }

  private execDeleteSlide(deck: Deck, op: DeleteSlideOp): void {
    const idx = deck.slides.findIndex((s) => s.slide_id === op.slide_id);
    deck.slides.splice(idx, 1);
  }

  // ── ApplyStyle ──────────────────────────────────────────────────────────

  private validateApplyStyle(deck: Deck, op: ApplyStyleOp): void {
    getStyleById(op.style_id); // throws STYLE_NOT_FOUND if invalid
  }

  private execApplyStyle(deck: Deck, op: ApplyStyleOp): void {
    deck.style_id = op.style_id;
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  private assertSlideExists(deck: Deck, slideId: string): void {
    if (!deck.slides.some((s) => s.slide_id === slideId)) {
      throw new AppError(ErrorCodes.SLIDE_NOT_FOUND, `Slide "${slideId}" not found`);
    }
  }
}
