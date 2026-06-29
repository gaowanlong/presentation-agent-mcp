import { describe, it, expect } from "vitest";
import { DeckSchema, SlideSchema, TitleSlideSchema, InsightSlideSchema, ComparisonSlideSchema, ArchitectureSlideSchema, SummarySlideSchema, AgendaSlideSchema } from "../src/schema/deck.schema.js";

describe("Deck Schema", () => {
  it("should validate a valid deck", () => {
    const validDeck = {
      deck_id: "deck_001",
      version: 1,
      title: "Test Deck",
      topic: "AI",
      audience: "Engineers",
      style_id: "allen_huawei_tech",
      slides: [
        {
          slide_id: "s001",
          type: "title" as const,
          title: "Title Slide",
          subtitle: "Subtitle",
          author: "Author",
          date: "2024-01-01",
        },
        {
          slide_id: "s002",
          type: "insight" as const,
          title: "Insight",
          key_points: ["Point 1", "Point 2", "Point 3"],
        },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const result = DeckSchema.safeParse(validDeck);
    expect(result.success).toBe(true);
  });

  it("should reject deck with no slides", () => {
    const invalidDeck = {
      deck_id: "deck_001",
      version: 1,
      title: "Test Deck",
      topic: "AI",
      style_id: "allen_huawei_tech",
      slides: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const result = DeckSchema.safeParse(invalidDeck);
    expect(result.success).toBe(false);
  });

  it("should reject unsupported slide type", () => {
    const invalidSlide = {
      slide_id: "s001",
      type: "unknown_type",
      title: "Test",
    };

    const result = SlideSchema.safeParse(invalidSlide);
    expect(result.success).toBe(false);
  });

  it("should validate title slide", () => {
    const slide = {
      slide_id: "s001",
      type: "title" as const,
      title: "Title",
      subtitle: "Sub",
      author: "Author",
      date: "2024-01-01",
    };
    expect(TitleSlideSchema.safeParse(slide).success).toBe(true);
  });

  it("should validate insight slide with key_points", () => {
    const slide = {
      slide_id: "s002",
      type: "insight" as const,
      title: "Insight",
      key_points: ["Point 1", "Point 2"],
    };
    expect(InsightSlideSchema.safeParse(slide).success).toBe(true);
  });

  it("should reject insight slide without key_points", () => {
    const slide = {
      slide_id: "s002",
      type: "insight" as const,
      title: "Insight",
    };
    const result = InsightSlideSchema.safeParse(slide);
    expect(result.success).toBe(false);
  });

  it("should validate comparison slide", () => {
    const slide = {
      slide_id: "s003",
      type: "comparison" as const,
      title: "Comparison",
      left: { title: "Left", points: ["A", "B"] },
      right: { title: "Right", points: ["C", "D"] },
    };
    expect(ComparisonSlideSchema.safeParse(slide).success).toBe(true);
  });

  it("should validate architecture slide", () => {
    const slide = {
      slide_id: "s004",
      type: "architecture" as const,
      title: "Architecture",
      layers: [
        { name: "Layer 1", components: ["A", "B"] },
        { name: "Layer 2", components: ["C"] },
      ],
    };
    expect(ArchitectureSlideSchema.safeParse(slide).success).toBe(true);
  });

  it("should validate summary slide", () => {
    const slide = {
      slide_id: "s005",
      type: "summary" as const,
      title: "Summary",
      takeaways: ["Takeaway 1", "Takeaway 2"],
    };
    expect(SummarySlideSchema.safeParse(slide).success).toBe(true);
  });

  it("should validate agenda slide", () => {
    const slide = {
      slide_id: "s006",
      type: "agenda" as const,
      title: "Agenda",
      items: [
        { label: "Item 1", description: "Desc 1" },
        { label: "Item 2" },
      ],
    };
    expect(AgendaSlideSchema.safeParse(slide).success).toBe(true);
  });
});
