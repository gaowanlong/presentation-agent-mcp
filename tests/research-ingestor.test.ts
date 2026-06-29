import { describe, it, expect } from "vitest";
import { ingestResearchBrief } from "../src/research/research-ingestor.js";

const sampleBrief = `# AI端侧研究报告

## 核心发现
端侧AI负载正从推理向Agent任务演进。传统OS架构面临资源碎片化问题。
行业技术路线正在向Agent-oriented方向迁移。建议重构内核资源管理抽象。

数据分析显示：NPU prefill延迟比CPU低18倍。3B模型需4.6GiB内存。
60%以上端侧AI场景受限于内存瓶颈。动态调度可提升资源利用率30%以上。

报告指出，端侧Agent将在2025年成为主流。`;

describe("ResearchIngestor", () => {
  it("should extract key findings", () => {
    const result = ingestResearchBrief(sampleBrief, "端侧AI");
    expect(result.key_findings.length).toBeGreaterThan(0);
    expect(result.key_findings.some((f) => f.includes("核心") || f.includes("演进") || f.includes("瓶颈"))).toBe(true);
  });

  it("should extract implications", () => {
    const result = ingestResearchBrief(sampleBrief, "端侧AI");
    expect(result.implications.length).toBeGreaterThan(0);
    expect(result.implications.some((i) => i.includes("建议"))).toBe(true);
  });

  it("should extract data points with numbers", () => {
    const result = ingestResearchBrief(sampleBrief, "端侧AI");
    expect(result.data_points.length).toBeGreaterThan(0);
    const hasPercent = result.data_points.some((d) => d.value.includes("%"));
    expect(hasPercent).toBe(true);
  });

  it("should extract quotes from indicative sentences", () => {
    const result = ingestResearchBrief(sampleBrief, "端侧AI");
    expect(result.quotes).toBeDefined();
    if (result.quotes) {
      expect(result.quotes.length).toBeGreaterThan(0);
    }
  });

  it("should handle empty input gracefully", () => {
    const result = ingestResearchBrief("", "Empty");
    expect(result.key_findings.length).toBeGreaterThan(0);
    expect(result.data_points.length).toBe(0);
  });

  it("should produce a title from the document", () => {
    const result = ingestResearchBrief(sampleBrief, "端侧AI");
    expect(result.title).toBeTruthy();
    expect(result.title).toContain("AI端侧");
  });

  it("should extract structured data from the real research report", () => {
    const realBrief = `端侧AI负载正从简单推理向复杂Agent任务演进。传统OS架构面对AI负载存在资源碎片化问题。
行业技术路线正在向Agent-oriented方向迁移。建议把编译/准备与执行/抢占彻底分离。
NPU在prefill上表现数量级优势，延迟降低18倍。decode仍受内存带宽约束。`;
    const result = ingestResearchBrief(realBrief, "端侧OS");
    expect(result.key_findings.length).toBeGreaterThan(0);
    expect(result.implications.length).toBeGreaterThan(0);
    // Data points with percentages should be found
    expect(result.data_points.length).toBeGreaterThan(0);
  });
});
