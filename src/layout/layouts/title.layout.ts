import { TitleSlide, StyleProfile } from "../../schema/index.js";
import { LayoutElement } from "../../schema/layout.schema.js";
import {
  canvasWidth,
  canvasHeight,
  CANVAS_MARGIN_X,
  textElement,
  shapeElement,
} from "../layout-utils.js";

export function layoutTitleSlide(
  slide: TitleSlide,
  style: StyleProfile
): LayoutElement[] {
  const elements: LayoutElement[] = [];

  // Background
  elements.push(
    shapeElement({
      x: 0,
      y: 0,
      w: canvasWidth(style),
      h: canvasHeight(style),
      shape: "rect",
      fill: style.colors.background,
    })
  );

  

  // Title
  elements.push(
    textElement({
      text: slide.title,
      x: CANVAS_MARGIN_X,
      y: 2.2,
      w: canvasWidth(style) - CANVAS_MARGIN_X * 2,
      h: 1.0,
      role: "title",
      font_size: 36,
      bold: true,
      color: style.colors.text,
    })
  );

  // Subtitle
  if (slide.subtitle) {
    elements.push(
      textElement({
        text: slide.subtitle,
        x: CANVAS_MARGIN_X,
        y: 3.3,
        w: canvasWidth(style) - CANVAS_MARGIN_X * 2,
        h: 0.6,
        role: "subtitle",
        font_size: style.typography.subtitle_size,
        color: style.colors.secondary,
      })
    );
  }

  // Author & date
  const meta = [slide.author, slide.date].filter(Boolean).join(" | ");
  if (meta) {
    elements.push(
      textElement({
        text: meta,
        x: CANVAS_MARGIN_X,
        y: 4.2,
        w: canvasWidth(style) - CANVAS_MARGIN_X * 2,
        h: 0.5,
        role: "caption",
        font_size: style.typography.caption_size,
        color: style.colors.muted_text,
      })
    );
  }

  // Bottom accent line
  elements.push(
    shapeElement({
      x: 0,
      y: canvasHeight(style) - 0.1,
      w: canvasWidth(style),
      h: 0.06,
      shape: "rect",
      fill: style.colors.primary,
    })
  );

  return elements;
}
