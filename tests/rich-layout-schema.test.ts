import { describe, expect, it } from "vitest";
import { RichTextSchema, ArchitectureSlideSchema, InsightSlideSchema, LayoutVariantEnum } from "../src/schema/deck.schema.js";

const card = { id: "card-1", title: "Agent-aware 调度", body: [{ text: "基于执行阶段分配资源" }] };
const diagram = { direction: "layered" as const, nodes: [{ id: "runtime", label: "Agent Runtime", group: "运行时层" }, { id: "scheduler", label: "Scheduler", group: "内核层" }], edges: [{ from: "runtime", to: "scheduler", relation: "calls" }] };

describe("rich layout schemas", () => {
  it("accepts non-empty rich text runs", () => expect(RichTextSchema.parse(card.body)).toEqual(card.body));
  it("rejects an empty rich text run", () => expect(() => RichTextSchema.parse([{ text: "" }])).toThrow());
  it("maps architecture_with_notes variant", () => expect(LayoutVariantEnum.parse("architecture_with_notes")).toBe("architecture_with_notes"));
  it("maps key_technology_quadrants variant", () => expect(LayoutVariantEnum.parse("key_technology_quadrants")).toBe("key_technology_quadrants"));
});
