import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { Deck } from "../schema/deck.schema.js";
import { LayoutElement, TextElement, ShapeElement } from "../schema/layout.schema.js";
import { StyleProfile } from "../schema/style.schema.js";
import { getStyleById } from "../styles/index.js";
import { AppError, ErrorCodes } from "../utils/errors.js";
import { LayoutEngine } from "../layout/layout-engine.js";

/** Convert 6-hex color to pdf-lib RGB. */
function hexToRgb(hex: string) {
  const h = hex.replace("#", "").substring(0, 6);
  return {
    r: parseInt(h.substring(0, 2), 16) / 255,
    g: parseInt(h.substring(2, 4), 16) / 255,
    b: parseInt(h.substring(4, 6), 16) / 255,
  };
}

export class PdfExporter {
  constructor(private layoutEngine: LayoutEngine) {}

  async export(deck: Deck): Promise<Buffer> {
    try {
      const style = getStyleById(deck.style_id);
      const layoutedDeck = this.layoutEngine.layout(deck);
      return await this.buildPdf(deck, layoutedDeck, style);
    } catch (err: any) {
      throw new AppError(ErrorCodes.EXPORT_FAILED, `Failed to export PDF: ${err?.message ?? String(err)}`);
    }
  }

  private async buildPdf(deck: Deck, layoutedDeck: any, style: StyleProfile): Promise<Buffer> {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

    const pageWidth = style.canvas.width * 72;  // inches to points
    const pageHeight = style.canvas.height * 72;

    for (const layoutedSlide of layoutedDeck.slides) {
      const page = doc.addPage([pageWidth, pageHeight]);

      for (const el of layoutedSlide.elements as LayoutElement[]) {
        this.renderElement(page, el, style, font, fontBold, pageWidth, pageHeight);
      }
    }

    return Buffer.from(await doc.save());
  }

  private renderElement(
    page: any, el: LayoutElement, style: StyleProfile,
    font: any, fontBold: any, pageWidth: number, pageHeight: number
  ): void {
    // pdf-lib origin is bottom-left; convert y
    const y = (y_: number) => pageHeight - y_ * 72 - (el.h * 72 || 0);

    switch (el.kind) {
      case "text": {
        const t = el as TextElement;
        if (!t.text) return;
        const isBold = t.bold || t.role === "title";
        const size = t.font_size || style.typography.body_size;
        const c = hexToRgb(t.color || style.colors.text);
        try {
          page.drawText(t.text, {
            x: t.x * 72,
            y: y(t.y) + 4,
            size: size * (72 / 96), // approx pt conversion
            font: isBold ? fontBold : font,
            color: rgb(c.r, c.g, c.b),
            maxWidth: t.w * 72,
            lineHeight: size * 1.3,
          });
        } catch { /* pdf-lib throws on empty text or unsupported chars */ }
        break;
      }
      case "shape": {
        const s = el as ShapeElement;
        if (s.shape === "line") break;
        const fillC = hexToRgb(s.fill || style.colors.background);
        page.drawRectangle({
          x: s.x * 72,
          y: y(s.y),
          width: s.w * 72,
          height: s.h * 72,
          color: rgb(fillC.r, fillC.g, fillC.b),
          borderColor: s.stroke ? (() => { const c = hexToRgb(s.stroke); return rgb(c.r, c.g, c.b); })() : undefined,
          borderWidth: s.stroke ? 0.5 : 0,
        });
        break;
      }
      case "card": {
        const cardC = hexToRgb(style.colors.card_background);
        const borderC = hexToRgb(style.colors.border);
        page.drawRectangle({
          x: el.x * 72, y: y(el.y), width: el.w * 72, height: el.h * 72,
          color: rgb(cardC.r, cardC.g, cardC.b),
          borderColor: rgb(borderC.r, borderC.g, borderC.b),
          borderWidth: 0.5,
        });
        break;
      }
      case "line":
        break;
    }
  }
}
