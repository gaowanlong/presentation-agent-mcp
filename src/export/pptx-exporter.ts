import PptxGenJS from "pptxgenjs";
import { Deck } from "../schema/deck.schema.js";
import { LayoutedDeck, LayoutElement, TextElement, ShapeElement, CardElement, LineElement } from "../schema/layout.schema.js";
import { StyleProfile } from "../schema/style.schema.js";
import { getStyleById } from "../styles/index.js";
import { AppError, ErrorCodes } from "../utils/errors.js";
import { LayoutEngine } from "../layout/layout-engine.js";
import { pptxColor } from "./pptx-theme.js";

export class PptxExporter {
  constructor(private layoutEngine: LayoutEngine) {}

  async export(deck: Deck): Promise<Buffer> {
    try {
      const style = getStyleById(deck.style_id);
      const layoutedDeck = this.layoutEngine.layout(deck);
      return await this.buildPptx(deck, layoutedDeck, style);
    } catch (err: any) {
      throw new AppError(
        ErrorCodes.EXPORT_FAILED,
        `Failed to export PPTX: ${err?.message ?? String(err)}`
      );
    }
  }

  private async buildPptx(
    deck: Deck,
    layoutedDeck: LayoutedDeck,
    style: StyleProfile
  ): Promise<Buffer> {
    const pptx = new PptxGenJS();

    pptx.defineLayout({
      name: "CUSTOM_16_9",
      width: style.canvas.width,
      height: style.canvas.height,
    });
    pptx.layout = "CUSTOM_16_9";

    for (const layoutedSlide of layoutedDeck.slides) {
      const slide = pptx.addSlide();

      for (const element of layoutedSlide.elements) {
        this.renderElement(slide, element, style);
      }
    }

    const result = await pptx.write({ outputType: "nodebuffer" });
    // result is already a Buffer when outputType is "nodebuffer"
    return Buffer.from(result as ArrayBuffer);
  }

  private renderElement(
    slide: any,
    element: LayoutElement,
    style: StyleProfile
  ): void {
    switch (element.kind) {
      case "text":
        this.renderText(slide, element as TextElement, style);
        break;
      case "shape":
        this.renderShape(slide, element as ShapeElement, style);
        break;
      case "card":
        this.renderCard(slide, element as CardElement, style);
        break;
      case "line":
        this.renderLine(slide, element as LineElement, style);
        break;
    }
  }

  private renderText(
    slide: any,
    el: TextElement,
    style: StyleProfile
  ): void {
    slide.addText(el.text, {
      x: el.x,
      y: el.y,
      w: el.w,
      h: el.h,
      fontSize: el.font_size || style.typography.body_size,
      fontFace: style.typography.font_face,
      color: pptxColor(el.color || style.colors.text),
      bold: el.bold || false,
      valign: "top" as const,
      align: "left" as const,
      wrap: true,
      margin: [0, 0, 0, 0],
    });
  }

  private renderShape(
    slide: any,
    el: ShapeElement,
    style: StyleProfile
  ): void {
    const opts: any = {
      x: el.x,
      y: el.y,
      w: el.w,
      h: el.h,
      fill: { color: pptxColor(el.fill || style.colors.background) },
    };

    if (el.stroke) {
      opts.line = { color: pptxColor(el.stroke), width: 1 };
    }

    if (el.shape === "roundRect") {
      opts.rectRadius = 0.1;
    }

    slide.addShape(el.shape === "roundRect" ? "roundRect" : "rect", opts);
  }

  private renderCard(
    slide: any,
    el: CardElement,
    style: StyleProfile
  ): void {
    const cardOpts: any = {
      x: el.x,
      y: el.y,
      w: el.w,
      h: el.h,
      fill: { color: pptxColor(style.colors.card_background) },
      line: { color: pptxColor(style.colors.border), width: 0.5 },
      rectRadius: 0.1,
    };

    slide.addShape("roundRect", cardOpts);

    if (el.title) {
      slide.addText(el.title, {
        x: el.x + 0.15,
        y: el.y + 0.1,
        w: el.w - 0.3,
        h: 0.4,
        fontSize: style.typography.body_size,
        fontFace: style.typography.font_face,
        color: pptxColor(style.colors.text),
        bold: true,
        wrap: true,
        margin: 0,
      });
    }

    if (el.body) {
      slide.addText(el.body, {
        x: el.x + 0.15,
        y: el.y + 0.5,
        w: el.w - 0.3,
        h: el.h - 0.6,
        fontSize: style.typography.caption_size,
        fontFace: style.typography.font_face,
        color: pptxColor(style.colors.muted_text),
        wrap: true,
        margin: 0,
      });
    }

    if (el.items) {
      const text = el.items.map((item) => `• ${item}`).join("\n");
      slide.addText(text, {
        x: el.x + 0.15,
        y: el.y + 0.15,
        w: el.w - 0.3,
        h: el.h - 0.3,
        fontSize: style.typography.caption_size,
        fontFace: style.typography.font_face,
        color: pptxColor(style.colors.text),
        wrap: true,
        margin: 0,
      });
    }
  }

  private renderLine(
    slide: any,
    el: LineElement,
    style: StyleProfile
  ): void {
    slide.addShape("line", {
      x: el.x,
      y: el.y,
      w: el.w,
      h: el.h || 0.01,
      line: {
        color: pptxColor(el.color || style.colors.border),
        width: el.width || 1,
      },
    });
  }
}
