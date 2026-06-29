import { describe, it, expect } from "vitest";
import { LayoutQualityGate } from "../src/quality/layout-quality-gate.js";
import { getStyleById } from "../src/styles/index.js";

describe("LayoutQualityGate", () => {
  const gate = new LayoutQualityGate();
  const style = getStyleById("allen_huawei_tech");

  it("rejects text outside the slide", () => {
    const result = gate.validate([
      { id: "t1", kind: "text", x: 12.8, y: 1, w: 1, h: 1, text: "outside", role: "body", font_size: 16, color: style.colors.text },
    ], style);
    expect(result.issues.some(i => i.type === "unintended_overlap")).toBe(true);
  });

  it("passes valid elements", () => {
    const result = gate.validate([
      { id: "t1", kind: "text", x: 0.5, y: 0.5, w: 5, h: 1, text: "Normal", role: "body", font_size: 16, color: style.colors.text },
    ], style);
    expect(result.score).toBe(100);
  });
});
