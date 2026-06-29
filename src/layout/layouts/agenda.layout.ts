import { AgendaSlide, StyleProfile } from "../../schema/index.js";
import { LayoutElement } from "../../schema/layout.schema.js";
import {
  CANVAS_MARGIN_X,
  CONTENT_Y_START,
  contentWidth,
  textElement,
  buildPageHeader,
  shapeElement,
  canvasHeight,
} from "../layout-utils.js";

export function layoutAgendaSlide(
  slide: AgendaSlide,
  style: StyleProfile
): LayoutElement[] {
  const elements: LayoutElement[] = [];

  // Background
  elements.push(
    shapeElement({
      x: 0,
      y: 0,
      w: style.canvas.width,
      h: canvasHeight(style),
      shape: "rect",
      fill: style.colors.background,
    })
  );

  elements.push(...buildPageHeader(style, slide.title));

  const startY = 2.0;
  const itemH = 0.7;
  const maxItems = Math.min(slide.items.length, 6);

  for (let i = 0; i < maxItems; i++) {
    const item = slide.items[i];
    const y = startY + i * itemH;

    // Number circle / bullet
    elements.push(
      textElement({
        text: `${i + 1}`,
        x: CANVAS_MARGIN_X + 0.1,
        y,
        w: 0.5,
        h: 0.5,
        role: "label",
        font_size: 14,
        bold: true,
        color: style.colors.primary,
      })
    );

    // Item label
    elements.push(
      textElement({
        text: item.label,
        x: CANVAS_MARGIN_X + 0.7,
        y,
        w: contentWidth(style) - 1.0,
        h: 0.4,
        role: "body",
        font_size: style.typography.body_size,
        bold: true,
        color: style.colors.text,
      })
    );

    // Description
    if (item.description) {
      elements.push(
        textElement({
          text: item.description,
          x: CANVAS_MARGIN_X + 0.7,
          y: y + 0.35,
          w: contentWidth(style) - 1.0,
          h: 0.3,
          role: "caption",
          font_size: style.typography.caption_size,
          color: style.colors.muted_text,
        })
      );
    }
  }

  return elements;
}
