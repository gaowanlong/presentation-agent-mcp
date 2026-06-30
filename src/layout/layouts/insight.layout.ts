import { InsightSlide, StyleProfile } from "../../schema/index.js";
import { LayoutElement } from "../../schema/layout.schema.js";
import {
  CANVAS_MARGIN_X,
  CANVAS_MARGIN_Y,
  contentWidth,
  textElement,
  shapeElement,
  cardElement,
  buildPageHeader,
  canvasHeight,
  canvasWidth,
} from "../layout-utils.js";

export function layoutInsightSlide(
  slide: InsightSlide,
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

  elements.push(...buildPageHeader(style, slide.title));

  const colW = (contentWidth(style) - 0.3) / 2;
  const startY = 1.8;

  // Left column: key points
  const leftX = CANVAS_MARGIN_X;
  elements.push(
    textElement({
      text: "关键观点",
      x: leftX,
      y: startY,
      w: colW,
      h: 0.4,
      role: "label",
      font_size: 14,
      bold: true,
      color: style.colors.text,
    })
  );

  const maxPoints = Math.min(slide.key_points.length, 5);
  for (let i = 0; i < maxPoints; i++) {
    const y = startY + 0.5 + i * 0.6;
    elements.push(
      textElement({
        text: `• ${slide.key_points[i]}`,
        x: leftX + 0.1,
        y,
        w: colW - 0.2,
        h: 0.5,
        role: "body",
        font_size: style.typography.body_size - 1,
        color: style.colors.text,
      })
    );
  }

  // Right column: evidence cards
  const rightX = CANVAS_MARGIN_X + colW + 0.3;
  elements.push(
    textElement({
      text: "数据支撑",
      x: rightX,
      y: startY,
      w: colW,
      h: 0.4,
      role: "label",
      font_size: 14,
      bold: true,
      color: style.colors.secondary,
    })
  );

  const evidenceItems = slide.evidence || [];
  const maxEvidence = Math.min(evidenceItems.length, 3);
  for (let i = 0; i < maxEvidence; i++) {
    const ev = evidenceItems[i];
    const y = startY + 0.5 + i * 1.1;
    // Card title bar background
    elements.push(
      shapeElement({
        x: rightX,
        y,
        w: colW,
        h: 0.35,
        shape: "rect",
        fill: style.colors.card_title_background,
      })
    );
    elements.push(
      shapeElement({
        x: rightX,
        y,
        w: colW,
        h: 0.9,
        shape: "roundRect",
        fill: style.colors.card_background,
        stroke: style.colors.card_border,
      })
    );
    elements.push(
      textElement({
        text: ev.label,
        x: rightX + 0.15,
        y: y + 0.05,
        w: colW - 0.3,
        h: 0.3,
        role: "label",
        font_size: style.typography.caption_size + 1,
        bold: true,
        color: style.colors.secondary,
      })
    );
    if (ev.value) {
      elements.push(
        textElement({
          text: ev.value,
          x: rightX + 0.15,
          y: y + 0.3,
          w: colW - 0.3,
          h: 0.25,
          role: "body",
          font_size: style.typography.body_size,
          bold: true,
          color: style.colors.primary,
        })
      );
    }
    if (ev.description) {
      elements.push(
        textElement({
          text: ev.description,
          x: rightX + 0.15,
          y: y + 0.55,
          w: colW - 0.3,
          h: 0.25,
          role: "caption",
          font_size: style.typography.caption_size,
          color: style.colors.muted_text,
        })
      );
    }
  }

  return elements;
}
