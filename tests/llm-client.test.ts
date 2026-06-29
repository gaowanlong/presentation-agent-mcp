import { describe, it, expect } from "vitest";
import { RuleBasedLLMClient } from "../src/llm/rule-based-client.js";
import { generateStoryline } from "../src/runtime/storyline-planner.js";

describe("RuleBasedLLMClient", () => {
  const client = new RuleBasedLLMClient();

  it("should expose provider name", () => {
    expect(client.name).toBe("rule-based");
  });

  it("generateStoryline should match built-in output", async () => {
    const result = await client.generateStoryline({ topic: "Test Topic", slide_count: 6 });
    const builtin = generateStoryline({ topic: "Test Topic", slide_count: 6 });
    expect(result.sections.length).toBe(builtin.sections.length);
    expect(result.sections.map(s => s.title)).toEqual(builtin.sections.map(s => s.title));
  });

  it("generateStoryline should handle research brief", async () => {
    const result = await client.generateStoryline({
      topic: "AI", slide_count: 8,
      research_brief: "端侧 AI 负载正从推理向 Agent 演进。传统 OS 架构存在资源碎片化问题。",
    });
    expect(result.sections.length).toBe(8);
  });

  it("generateDeck should produce a valid deck", async () => {
    const storyline = generateStoryline({ topic: "Deck Gen Test", slide_count: 6 });
    const deck = await client.generateDeck({
      topic: "Deck Gen Test", slide_count: 6, style_id: "allen_huawei_tech", storyline,
    });
    expect(deck.slides.length).toBe(6);
    expect(deck.deck_id).toBeTruthy();
    expect(deck.version).toBe(1);
  });

  it("generatePatch should produce comparison slide", async () => {
    const slide = { slide_id: "s001", type: "insight", title: "Old", key_points: ["A"] } as any;
    const result = await client.generatePatch(slide, "对比传统方案和新方案", "Test");
    expect(result.type).toBe("comparison");
  });

  it("generatePatch should produce architecture slide", async () => {
    const slide = { slide_id: "s001", type: "insight", title: "Old", key_points: ["A"] } as any;
    const result = await client.generatePatch(slide, "改成三层架构图", "Test");
    expect(result.type).toBe("architecture");
  });

  it("generatePatch should produce roadmap slide", async () => {
    const slide = { slide_id: "s001", type: "insight", title: "Old", key_points: ["A"] } as any;
    const result = await client.generatePatch(slide, "改成演进路线图", "Test");
    expect(result.type).toBe("roadmap");
  });

  it("generatePatch should produce timeline slide", async () => {
    const slide = { slide_id: "s001", type: "insight", title: "Old", key_points: ["A"] } as any;
    const result = await client.generatePatch(slide, "改成时间线展示", "Test");
    expect(result.type).toBe("timeline");
  });

  it("generatePatch should produce case study slide", async () => {
    const slide = { slide_id: "s001", type: "insight", title: "Old", key_points: ["A"] } as any;
    const result = await client.generatePatch(slide, "改成实践案例展示", "Test");
    expect(result.type).toBe("case_study");
  });

  it("generatePatch should produce insight slide by default", async () => {
    const slide = { slide_id: "s001", type: "insight", title: "Old", key_points: ["A"] } as any;
    const result = await client.generatePatch(slide, "更新内容", "Test");
    expect(result.type).toBe("insight");
  });
});
