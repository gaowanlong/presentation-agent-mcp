import { describe, it, expect } from "vitest";
import { ContentQualityGate } from "../src/quality/content-quality-gate.js";
import { deckWithInsights } from "./helpers/deck-fixtures.js";

describe("ContentQualityGate", () => {
  it("reports duplicate insight bodies", () => {
    const result = new ContentQualityGate().validate(deckWithInsights([
      ["Unique claim A", "Shared evidence"],
      ["Unique claim B", "Shared evidence"],
    ]));
    expect(result.issues.some(i => i.type === "duplicate_slide_content")).toBe(true);
  });

  it("reports an unsupported numeric claim", () => {
    const result = new ContentQualityGate().validate(
      deckWithInsights([["性能提升 88%（无数据支撑）"]])
    );
    expect(result.issues.some(i => i.type === "unsupported_numeric_claim")).toBe(true);
  });

  it("passes clean deck without issues", () => {
    const result = new ContentQualityGate().validate(deckWithInsights([
      ["Unique claim one"],
      ["Unique claim two"],
    ]));
    expect(result.score).toBe(100);
    expect(result.issues.length).toBe(0);
  });
});
