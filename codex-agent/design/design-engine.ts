import { DesignSpec } from "./design-spec.js";

export interface DesignElement { id?: string; x: number; y: number; w: number; h: number; fontSize?: number; color?: string; bold?: boolean; align?: string; type?: string; }

export class DesignEngine {
  apply(spec: DesignSpec, elements: DesignElement[]): DesignElement[] {
    return elements.map(el => {
      const e = { ...el };
      // Apply typography
      if (e.type === "title" || e.type === "heading") { e.fontSize = spec.typography.titleSize; e.color = spec.typography.titleColor; e.bold = spec.hierarchy.titleWeight === "bold"; e.align = spec.alignment.titleAlign; }
      else if (e.type === "body" || e.type === "text") { e.fontSize = spec.typography.bodySize; e.color = e.color || "#333333"; e.align = spec.alignment.bodyAlign; }
      // Apply spacing
      return e;
    });
  }

  applySpacing(spec: DesignSpec, elements: DesignElement[]): DesignElement[] {
    return elements.map(e => ({ ...e, x: e.x + spec.spacing.margin, y: e.y + spec.spacing.margin }));
  }

  applyTypography(spec: DesignSpec, elements: DesignElement[]): DesignElement[] {
    return elements.map(e => ({ ...e, fontSize: e.fontSize || spec.typography.bodySize }));
  }

  optimize(elements: DesignElement[], spec: DesignSpec): DesignElement[] {
    return this.applySpacing(spec, this.apply(spec, elements));
  }
}

