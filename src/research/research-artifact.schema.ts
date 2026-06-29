import { z } from "zod";

export const DataPointSchema = z.object({
  metric: z.string(),
  value: z.string(),
  source: z.string().optional(),
});
export type DataPoint = z.infer<typeof DataPointSchema>;

export const ResearchArtifactSchema = z.object({
  title: z.string(),
  key_findings: z.array(z.string()),
  implications: z.array(z.string()),
  data_points: z.array(DataPointSchema),
  quotes: z.array(z.string()).optional(),
  raw_text: z.string().optional(),
});
export type ResearchArtifact = z.infer<typeof ResearchArtifactSchema>;
