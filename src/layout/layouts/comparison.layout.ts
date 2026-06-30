import { ComparisonSlide, StyleProfile } from "../../schema/index.js";
import { LayoutElement } from "../../schema/layout.schema.js";
import {
  CANVAS_MARGIN_X,
  contentWidth,
  textElement,
  shapeElement,
  buildPageHeader,
  canvasHeight,
  canvasWidth,
} from "../layout-utils.js";

export function layoutComparisonSlide(
  slide: ComparisonSlide,
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

  const colW = (contentWidth(style) - 0.4) / 2;
  const leftX = CANVAS_MARGIN_X;
  const rightX = CANVAS_MARGIN_X + colW + 0.4;
  const startY = 1.8;
  const colH = 4.2;

  // Left column card
  elements.push(
    shapeElement({
      x: leftX,
      y: startY,
      w: colW,
      h: colH,
      shape: "roundRect",
      fill: style.colors.card_background,
      stroke: style.colors.border,
    })
  );

  // Left title
  elements.push(
    textElement({
      text: slide.left.title,
      x: leftX + 0.15,
      y: startY + 0.1,
      w: colW - 0.3,
      h: 0.4,
      role: "subtitle",
      font_size: style.typography.subtitle_size,
      bold: true,
      color: style.colors.text,
    })
  );

  // Left divider
  elements.push(
    shapeElement({
      x: leftX + 0.15,
      y: startY + 0.55,
      w: colW - 0.3,
      h: 0.03,
      shape: "rect",
      fill: style.colors.border,
    })
  );

  // Left points
  const maxLeft = Math.min(slide.left.points.length, 5);
  for (let i = 0; i < maxLeft; i++) {
    const y = startY + 0.75 + i * 0.6;
    elements.push(
      textElement({
        text: `✗ ${slide.left.points[i]}`,
        x: leftX + 0.2,
        y,
        w: colW - 0.4,
        h: 0.5,
        role: "body",
        font_size: style.typography.body_size - 1,
        color: style.colors.text,
      })
    );
  }

  // Right column card
  elements.push(
    shapeElement({
      x: rightX,
      y: startY,
      w: colW,
      h: colH,
      shape: "roundRect",
      fill: style.colors.card_background,
      stroke: style.colors.primary,
    })
  );

  // Right title
  elements.push(
    textElement({
      text: slide.right.title,
      x: rightX + 0.15,
      y: startY + 0.1,
      w: colW - 0.3,
      h: 0.4,
      role: "subtitle",
      font_size: style.typography.subtitle_size,
      bold: true,
      color: style.colors.text,
    })
  );

  // Right divider
  elements.push(
    shapeElement({
      x: rightX + 0.15,
      y: startY + 0.55,
      w: colW - 0.3,
      h: 0.03,
      shape: "rect",
      fill: style.colors.primary,
    })
  );

  // Right points
  const maxRight = Math.min(slide.right.points.length, 5);
  for (let i = 0; i < maxRight; i++) {
    const y = startY + 0.75 + i * 0.6;
    elements.push(
      textElement({
        text: `✓ ${slide.right.points[i]}`,
        x: rightX + 0.2,
        y,
        w: colW - 0.4,
        h: 0.5,
        role: "body",
        font_size: style.typography.body_size - 1,
        color: style.colors.text,
      })
    );
  }

  // Conclusion
  if (slide.conclusion) {
    const concY = startY + colH + 0.25;
    elements.push(
      shapeElement({
        x: CANVAS_MARGIN_X,
        y: concY,
        w: contentWidth(style),
        h: 0.5,
        shape: "roundRect",
        fill: style.colors.card_background,
      })
    );
    elements.push(
      textElement({
        text: `结论: ${slide.conclusion}`,
        x: CANVAS_MARGIN_X + 0.2,
        y: concY + 0.05,
        w: contentWidth(style) - 0.4,
        h: 0.4,
        role: "body",
        font_size: style.typography.body_size,
        bold: true,
        color: style.colors.accent,
      })
    );
  }

  return elements;
}
