import { describe, expect, it } from "vitest";
import { isAssertionTitle } from "../src/quality/assertion-title.js";
describe("assertion titles", () => {
  it("rejects generic section labels", () => {
    expect(isAssertionTitle("背景与趋势")).toBe(false);
    expect(isAssertionTitle("关键洞察")).toBe(false);
    expect(isAssertionTitle("目标架构")).toBe(false);
  });
  it("accepts a title that states a conclusion", () => {
    expect(isAssertionTitle("统一控制面让 Agent 负载获得端到端资源保障")).toBe(true);
    expect(isAssertionTitle("Dynamic scheduling improves utilization by 30%")).toBe(true);
  });
});
