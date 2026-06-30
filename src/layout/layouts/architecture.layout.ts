import { ArchitectureSlide, StyleProfile } from "../../schema/index.js";
import { LayoutElement } from "../../schema/layout.schema.js";
import {
  CANVAS_MARGIN_X,
  CANVAS_MARGIN_Y,
  contentWidth,
  textElement,
  shapeElement,
  buildPageHeader,
  canvasHeight,
  canvasWidth,
} from "../layout-utils.js";

export function layoutArchitectureSlide(
  slide: ArchitectureSlide,
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

  const maxLayers = Math.min(slide.layers.length, 5);
  const layerW = contentWidth(style) - 0.5;
  const layerX = CANVAS_MARGIN_X + 0.25;
  const availableH = canvasHeight(style) - 2.5;
  const layerH = Math.min(availableH / maxLayers, 1.1);
  const totalH = maxLayers * layerH + (maxLayers - 1) * 0.15;
  const startY = (canvasHeight(style) - totalH) / 2 + 0.2;

  const layerColors = [
    style.colors.primary,
    style.colors.secondary,
    style.colors.accent,
    style.colors.secondary,
    style.colors.primary,
  ];

  for (let i = 0; i < maxLayers; i++) {
    const layer = slide.layers[i];
    const y = startY + i * (layerH + 0.15);
    const color = layerColors[i % layerColors.length];

    // Layer background
    elements.push(
      shapeElement({
        x: layerX,
        y,
        w: layerW,
        h: layerH,
        shape: "roundRect",
        fill: color + "18",
        stroke: style.colors.card_border,
      })
    );

    // Layer name
    elements.push(
      textElement({
        text: layer.name,
        x: layerX + 0.2,
        y: y + 0.05,
        w: 2.0,
        h: 0.35,
        role: "label",
        font_size: style.typography.body_size,
        bold: true,
        color: color,
      })
    );

    // Layer description
    if (layer.description) {
      elements.push(
        textElement({
          text: layer.description,
          x: layerX + 0.2,
          y: y + 0.35,
          w: 2.0,
          h: 0.3,
          role: "caption",
          font_size: style.typography.caption_size,
          color: style.colors.muted_text,
        })
      );
    }

    // Components list
    const comps = layer.components.join("  |  ");
    elements.push(
      textElement({
        text: comps,
        x: layerX + 0.2,
        y: y + 0.7,
        w: layerW - 0.4,
        h: 0.3,
        role: "body",
        font_size: style.typography.body_size - 2,
        color: style.colors.text,
      })
    );
  }

  // Arrow connectors between layers
  if (maxLayers > 1) {
    for (let i = 0; i < maxLayers - 1; i++) {
      const y = startY + (i + 1) * (layerH + 0.15) - 0.08;
      elements.push(
        textElement({
          text: "▼",
          x: canvasWidth(style) - 1.0,
          y,
          w: 0.4,
          h: 0.2,
          role: "caption",
          font_size: 10,
          color: style.colors.muted_text,
        })
      );
    }
  }

  return elements;
}
