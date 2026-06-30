import { SummarySlide, StyleProfile } from "../../schema/index.js";
import { LayoutElement } from "../../schema/layout.schema.js";
import {
  CANVAS_MARGIN_X,
  contentWidth,
  textElement,
  shapeElement,
  buildPageHeader,
  canvasHeight,
  canvasWidth,
  cardElement,
} from "../layout-utils.js";

export function layoutSummarySlide(
  slide: SummarySlide,
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

  // Takeaways section
  const startY = 2.0;
  const cardW = (contentWidth(style) - 0.5) / 3;
  const cardH = 2.0;

  elements.push(
    textElement({
      text: "核心结论",
      x: CANVAS_MARGIN_X,
      y: startY - 0.5,
      w: contentWidth(style),
      h: 0.4,
      role: "label",
      font_size: 14,
      bold: true,
      color: style.colors.secondary,
    })
  );

  const maxTakeaways = Math.min(slide.takeaways.length, 3);
  for (let i = 0; i < maxTakeaways; i++) {
    const x = CANVAS_MARGIN_X + i * (cardW + 0.25);

    // Card background
    elements.push(
      shapeElement({
        x,
        y: startY,
        w: cardW,
        h: cardH,
        shape: "rect",
        fill: style.colors.card_background,
        stroke: style.colors.border,
      })
    );

    // Number
    elements.push(
      textElement({
        text: `${i + 1}`,
        x: x + 0.15,
        y: startY + 0.1,
        w: 0.5,
        h: 0.4,
        role: "label",
        font_size: 24,
        bold: true,
        color: style.colors.primary,
      })
    );

    // Takeaway text
    elements.push(
      textElement({
        text: slide.takeaways[i],
        x: x + 0.2,
        y: startY + 0.6,
        w: cardW - 0.4,
        h: 1.2,
        role: "body",
        font_size: style.typography.body_size - 1,
        color: style.colors.text,
      })
    );
  }

  // Next steps
  const nextStartY = startY + cardH + 0.4;
  if (slide.next_steps && slide.next_steps.length > 0) {
    elements.push(
      textElement({
        text: "下一步行动",
        x: CANVAS_MARGIN_X,
        y: nextStartY,
        w: contentWidth(style),
        h: 0.4,
        role: "label",
        font_size: 14,
        bold: true,
        color: style.colors.secondary,
      })
    );

    const maxSteps = Math.min(slide.next_steps.length, 4);
    for (let i = 0; i < maxSteps; i++) {
      elements.push(
        textElement({
          text: `→  ${slide.next_steps[i]}`,
          x: CANVAS_MARGIN_X + 0.3,
          y: nextStartY + 0.4 + i * 0.4,
          w: contentWidth(style) - 0.6,
          h: 0.35,
          role: "body",
          font_size: style.typography.body_size,
          color: style.colors.accent,
        })
      );
    }
  }

  return elements;
}
