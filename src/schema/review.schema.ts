import { z } from "zod";

export const IssueSeverityEnum = z.enum(["low", "medium", "high"]);

export const IssueTypeEnum = z.enum([
  "title_too_long",
  "too_many_bullets",
  "text_too_dense",
  "empty_slide",
  "missing_agenda",
  "missing_summary",
  "unbalanced_comparison",
  "too_many_architecture_layers",
  "weak_message",
  // V0.3 stricter checks
  "weak_title",
  "generic_message",
  "duplicate_slide_content",
  "unsupported_numeric_claim",
  "unintended_overlap",
  "duplicate_slide_message",
  "missing_evidence_for_claim",
  "roadmap_without_timeframe",
  "case_study_without_implication",
]);

export const ReviewIssueSchema = z.object({
  slide_id: z.string().optional(),
  severity: IssueSeverityEnum,
  type: IssueTypeEnum,
  message: z.string(),
});
export type ReviewIssue = z.infer<typeof ReviewIssueSchema>;

export const ReviewResultSchema = z.object({
  deck_id: z.string(),
  score: z.number().min(0).max(100),
  issues: z.array(ReviewIssueSchema),
  suggestions: z.array(z.string()),
});
export type ReviewResult = z.infer<typeof ReviewResultSchema>;

export const ReviewDeckInputSchema = z.object({
  deck_id: z.string().min(1),
});
