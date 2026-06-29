export interface BalanceReport { score: number; issues: string[]; suggestions: string[]; density: number; whitespaceRatio: number; }

export class VisualBalance {
  evaluate(elements: Array<{ x: number; y: number; w: number; h: number; type?: string }>, slideW: number = 13.333, slideH: number = 7.5): BalanceReport {
    const totalArea = slideW * slideH;
    const elementArea = elements.reduce((sum, e) => sum + e.w * e.h, 0);
    const density = elementArea / totalArea;
    const whitespaceRatio = 1 - density;
    const issues: string[] = [];
    const suggestions: string[] = [];

    // Check density
    if (density > 0.65) { issues.push("Slide overcrowded (density " + density.toFixed(2) + ")"); suggestions.push("Reduce text or increase whitespace"); }
    if (whitespaceRatio < 0.15) { issues.push("Insufficient whitespace (" + (whitespaceRatio * 100).toFixed(0) + "%)"); suggestions.push("Add margins between sections"); }

    // Check horizontal balance
    const leftWeight = elements.filter(e => e.x < slideW / 2).reduce((s, e) => s + e.w * e.h, 0);
    const rightWeight = elements.filter(e => e.x >= slideW / 2).reduce((s, e) => s + e.w * e.h, 0);
    const ratio = leftWeight > 0 && rightWeight > 0 ? Math.max(leftWeight, rightWeight) / Math.min(leftWeight, rightWeight) : 1;
    if (ratio > 2) { issues.push("Unbalanced horizontal distribution (ratio " + ratio.toFixed(1) + ":1)"); suggestions.push("Re-distribute content horizontally"); }

    // Check vertical center
    const centerY = elements.reduce((s, e) => s + e.y + e.h / 2, 0) / elements.length;
    const centerOffset = Math.abs(centerY - slideH / 2);
    if (centerOffset > slideH * 0.15) { issues.push("Visual center misaligned (offset " + (centerOffset * 100).toFixed(0) + "%)"); suggestions.push("Adjust vertical layout to center content"); }

    const score = Math.max(0, Math.min(100, 100 - issues.length * 12));
    return { score, issues, suggestions, density, whitespaceRatio };
  }
}

