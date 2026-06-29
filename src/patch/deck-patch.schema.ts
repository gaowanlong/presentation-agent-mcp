import { z } from "zod";

// ── Operation types ──────────────────────────────────────────────────────────

export const OperationTypeEnum = z.enum([
  "replace_slide",
  "update_slide_fields",
  "insert_slide",
  "delete_slide",
  "apply_style",
]);
export type OperationType = z.infer<typeof OperationTypeEnum>;

// ── ReplaceSlide ─────────────────────────────────────────────────────────────

export const ReplaceSlideOpSchema = z.object({
  op: z.literal("replace_slide"),
  slide_id: z.string().min(1),
  slide: z.record(z.string(), z.unknown()),
});
export type ReplaceSlideOp = z.infer<typeof ReplaceSlideOpSchema>;

// ── UpdateSlideFields ────────────────────────────────────────────────────────

export const UpdateSlideFieldsOpSchema = z.object({
  op: z.literal("update_slide_fields"),
  slide_id: z.string().min(1),
  fields: z.record(z.string(), z.unknown()),
});
export type UpdateSlideFieldsOp = z.infer<typeof UpdateSlideFieldsOpSchema>;

// ── InsertSlide ──────────────────────────────────────────────────────────────

export const InsertSlideOpSchema = z.object({
  op: z.literal("insert_slide"),
  slide: z.record(z.string(), z.unknown()),
  after_slide_id: z.string().optional(),
  before_slide_id: z.string().optional(),
});
export type InsertSlideOp = z.infer<typeof InsertSlideOpSchema>;

// ── DeleteSlide ──────────────────────────────────────────────────────────────

export const DeleteSlideOpSchema = z.object({
  op: z.literal("delete_slide"),
  slide_id: z.string().min(1),
});
export type DeleteSlideOp = z.infer<typeof DeleteSlideOpSchema>;

// ── ApplyStyle ───────────────────────────────────────────────────────────────

export const ApplyStyleOpSchema = z.object({
  op: z.literal("apply_style"),
  style_id: z.string().min(1),
});
export type ApplyStyleOp = z.infer<typeof ApplyStyleOpSchema>;

// ── PatchOperation discriminated union ────────────────────────────────────────

export const PatchOperationSchema = z.discriminatedUnion("op", [
  ReplaceSlideOpSchema,
  UpdateSlideFieldsOpSchema,
  InsertSlideOpSchema,
  DeleteSlideOpSchema,
  ApplyStyleOpSchema,
]);
export type PatchOperation = z.infer<typeof PatchOperationSchema>;

// ── DeckPatch ────────────────────────────────────────────────────────────────

export const DeckPatchSchema = z.object({
  patch_id: z.string().min(1),
  deck_id: z.string().min(1),
  description: z.string().optional(),
  old_version: z.number().int().positive(),
  new_version: z.number().int().positive(),
  operations: z.array(PatchOperationSchema).min(1),
  created_at: z.string(),
});
export type DeckPatch = z.infer<typeof DeckPatchSchema>;

// ── PatchSummary (for MCP tool return) ───────────────────────────────────────

export const PatchSummarySchema = z.object({
  deck_id: z.string(),
  patch_id: z.string(),
  old_version: z.number(),
  new_version: z.number(),
  operation_count: z.number(),
  operations: z.array(
    z.object({
      op: OperationTypeEnum,
      slide_id: z.string().optional(),
    })
  ),
  slide_count: z.number(),
});
export type PatchSummary = z.infer<typeof PatchSummarySchema>;

// ── PatchResult (internal) ───────────────────────────────────────────────────

export const PatchResultSchema = z.object({
  deck_id: z.string(),
  patch_id: z.string(),
  old_version: z.number(),
  new_version: z.number(),
  patch: DeckPatchSchema,
});
export type PatchResult = z.infer<typeof PatchResultSchema>;
