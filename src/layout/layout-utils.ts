import { StyleProfile } from "../schema/style.schema.js";
import { generateId } from "../utils/ids.js";

export const CANVAS_MARGIN_X = 0.6;
export const CANVAS_MARGIN_Y = 0.5;
export const TITLE_BAR_HEIGHT = 0.9;
export const CONTENT_Y_START = 1.5;
export const CARD_GAP = 0.25;

export function canvasWidth(style: StyleProfile): number {
  return style.canvas.width;
}

export function canvasHeight(style: StyleProfile): number {
  return style.canvas.height;
}

export function contentWidth(style: StyleProfile): number {
  return canvasWidth(style) - CANVAS_MARGIN_X * 2;
}

export function contentHeight(style: StyleProfile): number {
  return canvasHeight(style) - CONTENT_Y_START - 0.8;
}

export interface TextOpts {
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
  role: "title" | "subtitle" | "body" | "caption" | "label";
  font_size?: number;
  bold?: boolean;
  color?: string;
}

export function textElement(opts: TextOpts) {
  return {
    id: generateId("el"),
    kind: "text" as const,
    ...opts,
  };
}

export interface ShapeOpts {
  x: number;
  y: number;
  w: number;
  h: number;
  shape: "rect" | "roundRect" | "line";
  fill?: string;
  stroke?: string;
}

export function shapeElement(opts: ShapeOpts) {
  return {
    id: generateId("el"),
    kind: "shape" as const,
    ...opts,
  };
}

export interface CardOpts {
  x: number;
  y: number;
  w: number;
  h: number;
  title?: string;
  body?: string;
  items?: string[];
}

export function cardElement(opts: CardOpts) {
  return {
    id: generateId("el"),
    kind: "card" as const,
    ...opts,
  };
}

export interface LineOpts {
  x: number;
  y: number;
  w: number;
  h: number;
  color?: string;
  width?: number;
}

export function lineElement(opts: LineOpts) {
  return {
    id: generateId("el"),
    kind: "line" as const,
    ...opts,
  };
}

export function buildPageHeader(
  style: StyleProfile,
  title: string
) {
  const bg = shapeElement({
    x: 0,
    y: 0,
    w: canvasWidth(style),
    h: TITLE_BAR_HEIGHT,
    shape: "rect",
    fill: style.colors.primary,
  });

  const titleEl = textElement({
    text: title,
    x: CANVAS_MARGIN_X,
    y: 0.15,
    w: contentWidth(style),
    h: 0.6,
    role: "title",
    font_size: style.typography.title_size,
    bold: true,
    color: "FFFFFF",
  });

  return [bg, titleEl];
}

export function buildPageNumber(
  style: StyleProfile,
  pageNum: number,
  totalPages: number
) {
  return textElement({
    text: `${pageNum} / ${totalPages}`,
    x: canvasWidth(style) - 1.2,
    y: canvasHeight(style) - 0.4,
    w: 1.0,
    h: 0.3,
    role: "caption",
    font_size: style.typography.caption_size,
    color: style.colors.muted_text,
  });
}
