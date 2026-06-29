// Re-exports and tool-level input/output schemas for MCP tool definitions
import { z } from "zod";

export const CreateDeckInputSchema = z.object({
  topic: z.string().min(1).describe("The topic/presentation subject"),
  audience: z.string().optional().describe("Target audience"),
  purpose: z.string().optional().describe("Presentation purpose"),
  research_brief: z.string().optional().describe("Research brief content"),
  slide_count: z.number().int().min(4).max(20).optional().default(8).describe("Number of slides"),
  style_id: z.enum(["default", "allen_huawei_tech"]).optional().default("allen_huawei_tech").describe("Style profile"),
});

export const CreateStorylineInputSchema = z.object({
  topic: z.string().min(1),
  audience: z.string().optional(),
  purpose: z.string().optional(),
  research_brief: z.string().optional(),
  slide_count: z.number().int().min(4).max(20).optional().default(8),
});

export const GetDeckInputSchema = z.object({
  deck_id: z.string().min(1),
});

export const ReviewDeckInputSchema = z.object({
  deck_id: z.string().min(1),
});

export const UpdateSlideInputSchema = z.object({
  deck_id: z.string().min(1),
  slide_id: z.string().min(1),
  instruction: z.string().min(1),
});

export const ExportPptxInputSchema = z.object({
  deck_id: z.string().min(1),
});

export const CreateStyleProfileInputSchema = z.object({
  style_id: z.enum(["default", "allen_huawei_tech"]).optional().default("allen_huawei_tech"),
});
