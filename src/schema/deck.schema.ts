import { z } from "zod";

export const SlideTypeEnum = z.enum([
  "title",
  "agenda",
  "insight",
  "comparison",
  "architecture",
  "summary",
  "roadmap",
  "timeline",
  "case_study",
]);
export type SlideType = z.infer<typeof SlideTypeEnum>;

export const SourceRefSchema = z.object({
  title: z.string(),
  url: z.string().optional(),
  note: z.string().optional(),
});
export type SourceRef = z.infer<typeof SourceRefSchema>;

export const BaseSlideSchema = z.object({
  slide_id: z.string().min(1),
  type: SlideTypeEnum,
  title: z.string().min(1),
  message: z.string().optional(),
  speaker_note: z.string().optional(),
  sources: z.array(SourceRefSchema).optional(),
});

export const TitleSlideSchema = BaseSlideSchema.extend({
  type: z.literal("title"),
  subtitle: z.string().optional(),
  author: z.string().optional(),
  date: z.string().optional(),
});
export type TitleSlide = z.infer<typeof TitleSlideSchema>;

export const AgendaSlideSchema = BaseSlideSchema.extend({
  type: z.literal("agenda"),
  items: z.array(
    z.object({
      label: z.string(),
      description: z.string().optional(),
    })
  ),
});
export type AgendaSlide = z.infer<typeof AgendaSlideSchema>;

export const InsightSlideSchema = BaseSlideSchema.extend({
  type: z.literal("insight"),
  key_points: z.array(z.string()),
  evidence: z.array(z.object({
    label: z.string(),
    value: z.string().optional(),
    description: z.string().optional(),
  })).optional(),
});
export type InsightSlide = z.infer<typeof InsightSlideSchema>;

export const ComparisonSlideSchema = BaseSlideSchema.extend({
  type: z.literal("comparison"),
  left: z.object({ title: z.string(), points: z.array(z.string()) }),
  right: z.object({ title: z.string(), points: z.array(z.string()) }),
  conclusion: z.string().optional(),
});
export type ComparisonSlide = z.infer<typeof ComparisonSlideSchema>;

export const ArchitectureSlideSchema = BaseSlideSchema.extend({
  type: z.literal("architecture"),
  layers: z.array(z.object({
    name: z.string(),
    description: z.string().optional(),
    components: z.array(z.string()),
  })),
  callouts: z.array(z.object({ target: z.string(), text: z.string() })).optional(),
});
export type ArchitectureSlide = z.infer<typeof ArchitectureSlideSchema>;

export const SummarySlideSchema = BaseSlideSchema.extend({
  type: z.literal("summary"),
  takeaways: z.array(z.string()),
  next_steps: z.array(z.string()).optional(),
});
export type SummarySlide = z.infer<typeof SummarySlideSchema>;

// ── V0.2 New types ──────────────────────────────────────────────────────

export const RoadmapSlideSchema = BaseSlideSchema.extend({
  type: z.literal("roadmap"),
  phases: z.array(z.object({
    name: z.string(),
    description: z.string().optional(),
    timeline: z.string().optional(),
    status: z.enum(["planned", "in_progress", "completed"]),
  })).min(1),
});
export type RoadmapSlide = z.infer<typeof RoadmapSlideSchema>;

export const TimelineSlideSchema = BaseSlideSchema.extend({
  type: z.literal("timeline"),
  events: z.array(z.object({
    date: z.string(),
    title: z.string(),
    description: z.string().optional(),
  })).min(1),
});
export type TimelineSlide = z.infer<typeof TimelineSlideSchema>;

export const CaseStudySlideSchema = BaseSlideSchema.extend({
  type: z.literal("case_study"),
  context: z.string(),
  challenge: z.string(),
  solution: z.string(),
  results: z.array(z.string()),
  metrics: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
});
export type CaseStudySlide = z.infer<typeof CaseStudySlideSchema>;

// ── Slide union ─────────────────────────────────────────────────────────

export const SlideSchema = z.discriminatedUnion("type", [
  TitleSlideSchema,
  AgendaSlideSchema,
  InsightSlideSchema,
  ComparisonSlideSchema,
  ArchitectureSlideSchema,
  SummarySlideSchema,
  RoadmapSlideSchema,
  TimelineSlideSchema,
  CaseStudySlideSchema,
]);
export type Slide = z.infer<typeof SlideSchema>;

export const DeckSchema = z.object({
  deck_id: z.string().min(1),
  version: z.number().int().positive(),
  title: z.string().min(1),
  subtitle: z.string().optional(),
  topic: z.string().min(1),
  audience: z.string().optional(),
  purpose: z.string().optional(),
  style_id: z.string().min(1),
  slides: z.array(SlideSchema).min(1),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Deck = z.infer<typeof DeckSchema>;

export const CreateDeckInputSchema = z.object({
  topic: z.string().min(1),
  audience: z.string().optional(),
  purpose: z.string().optional(),
  research_brief: z.string().optional(),
  slide_count: z.number().int().min(4).max(20).optional().default(8),
  style_id: z.enum(["default", "allen_huawei_tech"]).optional().default("allen_huawei_tech"),
});

export const CreateDeckResultSchema = z.object({
  deck_id: z.string(), version: z.number(), title: z.string(), slide_count: z.number(),
  slides: z.array(z.object({ slide_id: z.string(), type: SlideTypeEnum, title: z.string() })),
});
export type CreateDeckResult = z.infer<typeof CreateDeckResultSchema>;

export const GetDeckInputSchema = z.object({ deck_id: z.string().min(1) });
export const UpdateSlideInputSchema = z.object({ deck_id: z.string().min(1), slide_id: z.string().min(1), instruction: z.string().min(1) });
export const ExportPptxInputSchema = z.object({ deck_id: z.string().min(1) });
