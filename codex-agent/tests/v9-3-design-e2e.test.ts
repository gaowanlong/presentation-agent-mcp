import { describe, it, expect } from "vitest";
import { defaultDesignSpec, techDesignSpec, DesignSpec } from "../design/design-spec.js";
import { DesignEngine, DesignElement } from "../design/design-engine.js";
import { VisualBalance } from "../design/visual-balance.js";
import { DesignRepairEngine } from "../design/design-repair-engine.js";

const sampleElements: DesignElement[] = [
  { type: "title", x: 0.5, y: 0.3, w: 12, h: 0.8, fontSize: 32 },
  { type: "body", x: 0.5, y: 1.5, w: 5.5, h: 4.5 },
  { type: "body", x: 6.5, y: 1.5, w: 5.5, h: 4.5 },
  { type: "body", x: 0.5, y: 6.2, w: 12, h: 0.5 },
];

describe("V0.9.3 Design Intelligence", () => {
  it("DesignSpec should have default values", () => {
    expect(defaultDesignSpec.typography.titleSize).toBe(28);
    expect(defaultDesignSpec.typography.titleColor).toBe("#A80000");
    expect(defaultDesignSpec.spacing.margin).toBe(0.5);
    expect(defaultDesignSpec.hierarchy.titleWeight).toBe("bold");
  });

  it("DesignEngine should apply typography to title elements", () => {
    const engine = new DesignEngine();
    const result = engine.apply(defaultDesignSpec, sampleElements);
    const title = result.find(e => e.type === "title");
    expect(title?.fontSize).toBe(28);
    expect(title?.color).toBe("#A80000");
    expect(title?.bold).toBe(true);
    expect(title?.align).toBe("left");
  });

  it("DesignEngine should apply spacing", () => {
    const engine = new DesignEngine();
    const spaced = engine.applySpacing(defaultDesignSpec, sampleElements);
    for (const el of spaced) {
      expect(el.x).toBeGreaterThanOrEqual(defaultDesignSpec.spacing.margin);
      expect(el.y).toBeGreaterThanOrEqual(defaultDesignSpec.spacing.margin);
    }
  });

  it("VisualBalance should detect overcrowded slides", () => {
    const balance = new VisualBalance();
    const denseElements: DesignElement[] = [
      { x: 0, y: 0, w: 13, h: 7, type: "body" },
    ];
    const report = balance.evaluate(denseElements);
    expect(report.density).toBeGreaterThan(0.6);
    expect(report.issues.length).toBeGreaterThan(0);
    expect(report.score).toBeLessThan(100);
  });

  it("VisualBalance should detect unbalanced distribution", () => {
    const balance = new VisualBalance();
    const leftHeavy: DesignElement[] = [
      { x: 0, y: 0, w: 10, h: 6, type: "body" },
      { x: 11, y: 0, w: 2, h: 1, type: "body" },
    ];
    const report = balance.evaluate(leftHeavy);
    const hasBalanceIssue = report.issues.some(i => i.includes("Unbalanced"));
    expect(hasBalanceIssue).toBe(true);
  });

  it("DesignRepairEngine should detect and report issues", () => {
    const repair = new DesignRepairEngine();
    const { valid, report } = repair.validate(defaultDesignSpec, sampleElements, 13.333, 7.5);
    expect(report.score).toBeGreaterThanOrEqual(0);
    expect(report.score).toBeLessThanOrEqual(100);
    expect(typeof valid).toBe("boolean");
  });

  it("DesignRepairEngine should perform repair actions", () => {
    const repair = new DesignRepairEngine();
    const denseElements: DesignElement[] = [{ x: 0, y: 0, w: 13, h: 7, type: "body" }];
    const result = repair.repair(denseElements, defaultDesignSpec);
    expect(result.actions.length).toBeGreaterThanOrEqual(0);
    expect(result.elements.length).toBe(1);
  });

  it("techDesignSpec should have different values from default", () => {
    expect(techDesignSpec.typography.titleColor).not.toBe(defaultDesignSpec.typography.titleColor);
    expect(techDesignSpec.spacing.margin).toBeGreaterThan(defaultDesignSpec.spacing.margin);
  });
});

