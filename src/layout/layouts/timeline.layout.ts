import { TimelineSlide, StyleProfile } from "../../schema/index.js";
import { LayoutElement } from "../../schema/layout.schema.js";
import {
  CANVAS_MARGIN_X, contentWidth, canvasHeight, canvasWidth,
  textElement, shapeElement, buildPageHeader,
} from "../layout-utils.js";

export function layoutTimelineSlide(slide: TimelineSlide, style: StyleProfile): LayoutElement[] {
  const elements: LayoutElement[] = [];
  elements.push(shapeElement({ x: 0, y: 0, w: canvasWidth(style), h: canvasHeight(style), shape: "rect", fill: style.colors.background }));
  elements.push(...buildPageHeader(style, slide.title));

  const events = slide.events.slice(0, 5);
  const startY = 2.0;
  const lineX = canvasWidth(style) / 2;
  const eventH = 0.9;

  // Vertical timeline line
  elements.push(shapeElement({ x: lineX - 0.015, y: startY, w: 0.03, h: events.length * eventH + 0.3, shape: "rect", fill: style.colors.border }));

  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    const y = startY + i * eventH + 0.15;
    const isLeft = i % 2 === 0;

    // Dot on timeline
    elements.push(shapeElement({ x: lineX - 0.08, y: y + 0.1, w: 0.16, h: 0.16, shape: "roundRect", fill: style.colors.primary }));

    if (isLeft) {
      elements.push(textElement({ text: ev.date, x: CANVAS_MARGIN_X, y, w: 3.5, h: 0.3, role: "caption", font_size: style.typography.caption_size, bold: true, color: style.colors.primary }));
      elements.push(textElement({ text: ev.title, x: CANVAS_MARGIN_X, y: y + 0.28, w: 3.5, h: 0.3, role: "body", font_size: style.typography.body_size - 1, color: style.colors.text }));
    } else {
      elements.push(textElement({ text: ev.date, x: lineX + 0.3, y, w: 3.5, h: 0.3, role: "caption", font_size: style.typography.caption_size, bold: true, color: style.colors.primary }));
      elements.push(textElement({ text: ev.title, x: lineX + 0.3, y: y + 0.28, w: 3.5, h: 0.3, role: "body", font_size: style.typography.body_size - 1, color: style.colors.text }));
    }
  }
  return elements;
}
