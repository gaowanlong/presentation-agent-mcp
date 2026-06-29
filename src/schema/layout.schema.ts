import { z } from "zod";
import { SlideTypeEnum } from "./deck.schema.js";

export const TextElementSchema = z.object({
  id: z.string(),
  kind: z.literal("text"),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  text: z.string(),
  role: z.enum(["title", "subtitle", "body", "caption", "label"]),
  font_size: z.number().optional(),
  bold: z.boolean().optional(),
  color: z.string().optional(),
});
export type TextElement = z.infer<typeof TextElementSchema>;

export const ShapeElementSchema = z.object({
  id: z.string(),
  kind: z.literal("shape"),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  shape: z.enum(["rect", "roundRect", "line"]),
  fill: z.string().optional(),
  stroke: z.string().optional(),
});
export type ShapeElement = z.infer<typeof ShapeElementSchema>;

export const CardElementSchema = z.object({
  id: z.string(),
  kind: z.literal("card"),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  title: z.string().optional(),
  body: z.string().optional(),
  items: z.array(z.string()).optional(),
});
export type CardElement = z.infer<typeof CardElementSchema>;

export const LineElementSchema = z.object({
  id: z.string(),
  kind: z.literal("line"),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  color: z.string().optional(),
  width: z.number().optional(),
});
export type LineElement = z.infer<typeof LineElementSchema>;

export const LayoutElementSchema = z.discriminatedUnion("kind", [
  TextElementSchema,
  ShapeElementSchema,
  CardElementSchema,
  LineElementSchema,
]);
export type LayoutElement = z.infer<typeof LayoutElementSchema>;

export const LayoutedSlideSchema = z.object({
  slide_id: z.string(),
  type: SlideTypeEnum,
  elements: z.array(LayoutElementSchema),
});
export type LayoutedSlide = z.infer<typeof LayoutedSlideSchema>;

export const LayoutedDeckSchema = z.object({
  deck_id: z.string(),
  style_id: z.string(),
  slides: z.array(LayoutedSlideSchema),
});
export type LayoutedDeck = z.infer<typeof LayoutedDeckSchema>;
