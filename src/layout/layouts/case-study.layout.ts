import { CaseStudySlide, StyleProfile } from "../../schema/index.js";
import { LayoutElement } from "../../schema/layout.schema.js";
import {
  CANVAS_MARGIN_X, contentWidth, canvasHeight, canvasWidth,
  textElement, shapeElement, buildPageHeader,
} from "../layout-utils.js";

export function layoutCaseStudySlide(slide: CaseStudySlide, style: StyleProfile): LayoutElement[] {
  const elements: LayoutElement[] = [];
  elements.push(shapeElement({ x: 0, y: 0, w: canvasWidth(style), h: canvasHeight(style), shape: "rect", fill: style.colors.background }));
  elements.push(...buildPageHeader(style, slide.title));

  const colW = (contentWidth(style) - 0.3) / 2;
  const startY = 2.0;

  // Left column: context + challenge
  const leftX = CANVAS_MARGIN_X;

  // Context
  elements.push(textElement({ text: "背景", x: leftX, y: startY, w: colW, h: 0.35, role: "label", font_size: 14, bold: true, color: style.colors.secondary }));
  elements.push(shapeElement({ x: leftX, y: startY + 0.4, w: colW, h: 1.5, shape: "rect", fill: style.colors.card_background, stroke: style.colors.border }));
  elements.push(textElement({ text: slide.context, x: leftX + 0.15, y: startY + 0.5, w: colW - 0.3, h: 1.3, role: "body", font_size: style.typography.body_size - 1, color: style.colors.text }));

  // Challenge
  const challengeY = startY + 2.2;
  elements.push(textElement({ text: "挑战", x: leftX, y: challengeY, w: colW, h: 0.35, role: "label", font_size: 14, bold: true, color: style.colors.primary }));
  elements.push(shapeElement({ x: leftX, y: challengeY + 0.4, w: colW, h: 1.2, shape: "rect", fill: style.colors.card_background, stroke: style.colors.border }));
  elements.push(textElement({ text: slide.challenge, x: leftX + 0.15, y: challengeY + 0.5, w: colW - 0.3, h: 1.0, role: "body", font_size: style.typography.body_size - 1, color: style.colors.text }));

  // Right column: solution + results
  const rightX = CANVAS_MARGIN_X + colW + 0.3;

  elements.push(textElement({ text: "方案", x: rightX, y: startY, w: colW, h: 0.35, role: "label", font_size: 14, bold: true, color: style.colors.accent }));
  elements.push(shapeElement({ x: rightX, y: startY + 0.4, w: colW, h: 1.5, shape: "rect", fill: style.colors.card_background, stroke: style.colors.border }));
  elements.push(textElement({ text: slide.solution, x: rightX + 0.15, y: startY + 0.5, w: colW - 0.3, h: 1.3, role: "body", font_size: style.typography.body_size - 1, color: style.colors.text }));

  // Results
  const resultY = startY + 2.2;
  elements.push(textElement({ text: "效果", x: rightX, y: resultY, w: colW, h: 0.35, role: "label", font_size: 14, bold: true, color: style.colors.accent }));

  for (let i = 0; i < Math.min(slide.results.length, 3); i++) {
    const y = resultY + 0.45 + i * 0.4;
    elements.push(textElement({ text: `✓ ${slide.results[i]}`, x: rightX + 0.1, y, w: colW - 0.2, h: 0.35, role: "body", font_size: style.typography.body_size - 1, color: style.colors.text }));
  }

  // Metrics bar
  if (slide.metrics && slide.metrics.length > 0) {
    const metricsY = startY + 4.2;
    elements.push(shapeElement({ x: CANVAS_MARGIN_X, y: metricsY, w: contentWidth(style), h: 0.8, shape: "rect", fill: style.colors.primary + "12" }));
    for (let i = 0; i < Math.min(slide.metrics.length, 4); i++) {
      const mx = CANVAS_MARGIN_X + 0.3 + i * (contentWidth(style) - 0.6) / Math.min(slide.metrics.length, 4);
      elements.push(textElement({ text: slide.metrics[i].value, x: mx, y: metricsY + 0.05, w: (contentWidth(style) - 0.6) / 4, h: 0.35, role: "body", font_size: style.typography.body_size, bold: true, color: style.colors.primary }));
      elements.push(textElement({ text: slide.metrics[i].label, x: mx, y: metricsY + 0.4, w: (contentWidth(style) - 0.6) / 4, h: 0.3, role: "caption", font_size: style.typography.caption_size, color: style.colors.muted_text }));
    }
  }

  return elements;
}
