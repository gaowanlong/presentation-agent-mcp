import { RoadmapSlide, StyleProfile } from "../../schema/index.js";
import { LayoutElement } from "../../schema/layout.schema.js";
import {
  CANVAS_MARGIN_X, contentWidth, canvasHeight, canvasWidth,
  textElement, shapeElement, buildPageHeader,
} from "../layout-utils.js";

export function layoutRoadmapSlide(slide: RoadmapSlide, style: StyleProfile): LayoutElement[] {
  const elements: LayoutElement[] = [];
  elements.push(shapeElement({ x: 0, y: 0, w: canvasWidth(style), h: canvasHeight(style), shape: "rect", fill: style.colors.background }));
  elements.push(...buildPageHeader(style, slide.title));

  const phases = slide.phases.slice(0, 5);
  const cardW = (contentWidth(style) - 0.5) / Math.min(phases.length, 4);
  const cardH = 3.2;
  const startY = 2.2;

  for (let i = 0; i < phases.length; i++) {
    const p = phases[i];
    const x = CANVAS_MARGIN_X + i * (cardW + 0.15);

    elements.push(shapeElement({ x, y: startY, w: cardW, h: cardH, shape: "rect", fill: style.colors.card_background, stroke: style.colors.border }));

    // Status indicator
    const statusColors: Record<string, string> = { completed: "2ECC71", in_progress: "F39C12", planned: style.colors.border };
    elements.push(shapeElement({ x, y: startY, w: cardW, h: 0.06, shape: "rect", fill: statusColors[p.status] || style.colors.border }));

    elements.push(textElement({ text: p.name, x: x + 0.15, y: startY + 0.2, w: cardW - 0.3, h: 0.4, role: "subtitle", font_size: style.typography.body_size, bold: true, color: style.colors.text }));
    if (p.timeline) elements.push(textElement({ text: p.timeline, x: x + 0.15, y: startY + 0.6, w: cardW - 0.3, h: 0.3, role: "caption", font_size: style.typography.caption_size, color: style.colors.muted_text }));
    if (p.description) elements.push(textElement({ text: p.description, x: x + 0.15, y: startY + 1.0, w: cardW - 0.3, h: cardH - 1.2, role: "body", font_size: style.typography.body_size - 1, color: style.colors.text }));
  }
  return elements;
}
