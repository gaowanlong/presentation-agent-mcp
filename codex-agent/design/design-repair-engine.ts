import { DesignSpec } from "./design-spec.js";
import { DesignElement } from "./design-engine.js";
import { VisualBalance, BalanceReport } from "./visual-balance.js";

export interface RepairAction { type: string; target?: string; description: string; }

export class DesignRepairEngine {
  private balance = new VisualBalance();

  repair(elements: DesignElement[], spec: DesignSpec, slideW: number = 13.333, slideH: number = 7.5): { elements: DesignElement[]; actions: RepairAction[] } {
    const report = this.balance.evaluate(elements, slideW, slideH);
    const actions: RepairAction[] = [];
    let repaired = [...elements];

    // Fix overcrowding: compress text elements
    if (report.density > spec.visual_balance.maxDensity) {
      const scale = spec.visual_balance.maxDensity / report.density;
      repaired = repaired.map(e => ({ ...e, h: e.h * scale }));
      actions.push({ type: "compress", description: "Compressed elements by factor " + scale.toFixed(2) });
    }

    // Fix insufficient whitespace
    if (report.whitespaceRatio < spec.visual_balance.minWhitespace) {
      const factor = 0.9;
      repaired = repaired.map(e => ({ ...e, x: e.x * factor, y: e.y * factor, w: e.w * factor, h: e.h * factor }));
      actions.push({ type: "shrink", description: "Reduced element sizes to increase whitespace" });
    }

    return { elements: repaired, actions };
  }

  validate(spec: DesignSpec, elements: DesignElement[], slideW: number, slideH: number): { valid: boolean; report: BalanceReport } {
    const report = this.balance.evaluate(elements, slideW, slideH);
    return { valid: report.score >= 70, report };
  }
}

