import { z } from "zod";

export const StyleProfileSchema = z.object({
  style_id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),

  canvas: z.object({
    width: z.number().positive(),
    height: z.number().positive(),
    unit: z.enum(["inch", "cm", "px"]),
  }),

  typography: z.object({
    font_face: z.string(),
    title_size: z.number().positive(),
    subtitle_size: z.number().positive(),
    body_size: z.number().positive(),
    caption_size: z.number().positive(),
  }),

  colors: z.object({
    background: z.string(),
    primary: z.string(),
    secondary: z.string(),
    accent: z.string(),
    text: z.string(),
    muted_text: z.string(),
    border: z.string(),
    card_background: z.string(),
  }),

  rules: z.object({
    title_max_chars_zh: z.number().positive(),
    max_bullets_per_slide: z.number().positive(),
    prefer_diagram_over_dense_text: z.boolean(),
    one_slide_one_message: z.boolean(),
    max_body_chars_per_slide: z.number().positive(),
  }),
});
export type StyleProfile = z.infer<typeof StyleProfileSchema>;

export const CreateStyleProfileInputSchema = z.object({
  style_id: z.enum(["default", "allen_huawei_tech"]).optional().default("allen_huawei_tech"),
});
