import { z } from "zod";

export const ArtifactFormatEnum = z.enum(["pptx", "pdf"]);
export type ArtifactFormat = z.infer<typeof ArtifactFormatEnum>;

export const ArtifactSchema = z.object({
  artifact_id: z.string().min(1),
  deck_id: z.string().min(1),
  format: ArtifactFormatEnum,
  mime_type: z.string(),
  size_bytes: z.number().nonnegative(),
  file_path: z.string(),
  download_url: z.string().optional(),
  created_at: z.string(),
});
export type Artifact = z.infer<typeof ArtifactSchema>;

export const MIMES: Record<string, string> = {
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  pdf: "application/pdf",
};
