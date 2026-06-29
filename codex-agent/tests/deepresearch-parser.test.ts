import { describe, it, expect } from "vitest";
import { parseDeepResearch } from "../planning/deepresearch-parser.js";

const sample = "# T\n## Background\nBg content\n## Insights\nKey i1\nKey i2\n## Architecture\nThree layers\n## Roadmap\nP1 plan\nP2 build\n## Summary\nConclusion.";

describe("DeepResearch Parser", () => {
  it("should parse title from doc", () => {
    const r = parseDeepResearch(sample);
    expect(r.topic).toBeTruthy();
  });
  it("should extract sections", () => {
    const r = parseDeepResearch(sample);
    expect(r.sections.insights.length).toBe(2);
    expect(r.sections.architecture).toBeTruthy();
  });
  it("should handle empty input", () => {
    const r = parseDeepResearch("");
    expect(r.sections.background.length).toBe(0);
  });
});
