import { describe, it, expect } from "vitest";
import { PatchEngine } from "../src/patch/patch-engine.js";
import { Deck, Slide } from "../src/schema/deck.schema.js";
import { DeckPatch } from "../src/patch/deck-patch.schema.js";

function makeFixture(): Deck {
  return {
    deck_id: "patch_test_deck",
    version: 1,
    title: "Patch Test",
    topic: "Testing",
    style_id: "allen_huawei_tech",
    slides: [
      { slide_id: "s001", type: "title" as const, title: "Title" },
      {
        slide_id: "s002",
        type: "agenda" as const,
        title: "Agenda",
        items: [{ label: "Item 1" }, { label: "Item 2" }],
      },
      {
        slide_id: "s003",
        type: "insight" as const,
        title: "Insight",
        key_points: ["Point A", "Point B"],
      },
    ],
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-01T00:00:00.000Z",
  };
}

function makePatch(
  deckId: string,
  oldVersion: number,
  operations: any[]
): DeckPatch {
  return {
    patch_id: "test_patch_001",
    deck_id: deckId,
    description: "Test patch",
    old_version: oldVersion,
    new_version: oldVersion + 1,
    operations: operations as any,
    created_at: "2024-01-02T00:00:00.000Z",
  };
}

describe("PatchEngine", () => {
  const engine = new PatchEngine();

  // ── replace_slide ────────────────────────────────────────────────────

  it("should replace an existing slide", () => {
    const deck = makeFixture();
    const patch = makePatch(deck.deck_id, deck.version, [
      { op: "replace_slide", slide_id: "s003", slide: { type: "summary", title: "New Summary", takeaways: ["T1"] } },
    ]);

    const result = engine.applyPatch(deck, patch);
    expect(result.new_version).toBe(2);
    expect(deck.version).toBe(2);
    expect(deck.slides[2].type).toBe("summary");
    expect((deck.slides[2] as any).takeaways).toEqual(["T1"]);
  });

  it("should throw on replace_slide with unknown slide_id", () => {
    const deck = makeFixture();
    const patch = makePatch(deck.deck_id, deck.version, [
      { op: "replace_slide", slide_id: "nonexistent", slide: { type: "insight", title: "X", key_points: [] } },
    ]);
    expect(() => engine.applyPatch(deck, patch)).toThrow(/not found/);
  });

  // ── update_slide_fields ──────────────────────────────────────────────

  it("should update fields on an existing slide", () => {
    const deck = makeFixture();
    const patch = makePatch(deck.deck_id, deck.version, [
      { op: "update_slide_fields", slide_id: "s001", fields: { title: "Updated Title" } },
    ]);

    engine.applyPatch(deck, patch);
    expect(deck.slides[0].title).toBe("Updated Title");
    expect(deck.slides[0].slide_id).toBe("s001");
  });

  it("should preserve slide_id when updating fields", () => {
    const deck = makeFixture();
    const patch = makePatch(deck.deck_id, deck.version, [
      { op: "update_slide_fields", slide_id: "s002", fields: { slide_id: "should-ignore", title: "New Agenda" } },
    ]);

    engine.applyPatch(deck, patch);
    expect(deck.slides[1].slide_id).toBe("s002");
    expect(deck.slides[1].title).toBe("New Agenda");
  });

  it("should throw on update_slide_fields with unknown slide_id", () => {
    const deck = makeFixture();
    const patch = makePatch(deck.deck_id, deck.version, [
      { op: "update_slide_fields", slide_id: "bad_id", fields: { title: "X" } },
    ]);
    expect(() => engine.applyPatch(deck, patch)).toThrow(/not found/);
  });

  // ── insert_slide ─────────────────────────────────────────────────────

  it("should insert a slide at the end when no position given", () => {
    const deck = makeFixture();
    const patch = makePatch(deck.deck_id, deck.version, [
      { op: "insert_slide", slide: { type: "summary", title: "End Summary", takeaways: ["T"] } },
    ]);

    engine.applyPatch(deck, patch);
    expect(deck.slides.length).toBe(4);
    expect(deck.slides[3].title).toBe("End Summary");
  });

  it("should insert a slide after a given slide_id", () => {
    const deck = makeFixture();
    const patch = makePatch(deck.deck_id, deck.version, [
      { op: "insert_slide", after_slide_id: "s001", slide: { type: "insight", title: "After Title", key_points: ["K"] } },
    ]);

    engine.applyPatch(deck, patch);
    expect(deck.slides.length).toBe(4);
    expect(deck.slides[1].title).toBe("After Title");
  });

  it("should insert a slide before a given slide_id", () => {
    const deck = makeFixture();
    const patch = makePatch(deck.deck_id, deck.version, [
      { op: "insert_slide", before_slide_id: "s003", slide: { type: "insight", title: "Before Insight", key_points: ["K"] } },
    ]);

    engine.applyPatch(deck, patch);
    expect(deck.slides.length).toBe(4);
    expect(deck.slides[2].title).toBe("Before Insight");
  });

  it("should throw when both after_slide_id and before_slide_id specified", () => {
    const deck = makeFixture();
    const patch = makePatch(deck.deck_id, deck.version, [
      { op: "insert_slide", after_slide_id: "s001", before_slide_id: "s002", slide: { type: "insight", title: "X", key_points: [] } },
    ]);
    expect(() => engine.applyPatch(deck, patch)).toThrow(/cannot specify both/);
  });

  // ── delete_slide ─────────────────────────────────────────────────────

  it("should delete an existing slide", () => {
    const deck = makeFixture();
    const patch = makePatch(deck.deck_id, deck.version, [
      { op: "delete_slide", slide_id: "s003" },
    ]);

    engine.applyPatch(deck, patch);
    expect(deck.slides.length).toBe(2);
    expect(deck.slides.find((s) => s.slide_id === "s003")).toBeUndefined();
  });

  it("should throw on delete_slide with unknown slide_id", () => {
    const deck = makeFixture();
    const patch = makePatch(deck.deck_id, deck.version, [
      { op: "delete_slide", slide_id: "ghost" },
    ]);
    expect(() => engine.applyPatch(deck, patch)).toThrow(/not found/);
  });

  it("should throw if deleting would leave fewer than 2 slides", () => {
    const deck = makeFixture();
    const patch = makePatch(deck.deck_id, deck.version, [
      { op: "delete_slide", slide_id: "s001" },
      { op: "delete_slide", slide_id: "s002" },
      { op: "delete_slide", slide_id: "s003" },
    ]);
    expect(() => engine.applyPatch(deck, patch)).toThrow();
  });

  // ── apply_style ──────────────────────────────────────────────────────

  it("should change the style_id", () => {
    const deck = makeFixture();
    const patch = makePatch(deck.deck_id, deck.version, [
      { op: "apply_style", style_id: "default" },
    ]);

    engine.applyPatch(deck, patch);
    expect(deck.style_id).toBe("default");
  });

  it("should throw on unknown style_id", () => {
    const deck = makeFixture();
    const patch = makePatch(deck.deck_id, deck.version, [
      { op: "apply_style", style_id: "nonexistent" },
    ]);
    expect(() => engine.applyPatch(deck, patch)).toThrow(/not found/);
  });

  // ── Mixed operations ─────────────────────────────────────────────────

  it("should apply multiple operations in order", () => {
    const deck = makeFixture();
    const patch = makePatch(deck.deck_id, deck.version, [
      { op: "update_slide_fields", slide_id: "s001", fields: { title: "Updated Title" } },
      { op: "insert_slide", after_slide_id: "s001", slide: { type: "insight", title: "New Insight", key_points: ["K"] } },
      { op: "delete_slide", slide_id: "s003" },
    ]);

    engine.applyPatch(deck, patch);
    expect(deck.slides.length).toBe(3);
    expect(deck.slides[0].title).toBe("Updated Title");
    expect(deck.slides[1].title).toBe("New Insight");
    expect(deck.slides.find((s) => s.slide_id === "s003")).toBeUndefined();
  });

  // ── Version and deck integrity ───────────────────────────────────────

  it("should bump version and set updated_at", () => {
    const deck = makeFixture();
    const oldUpdatedAt = deck.updated_at;
    const patch = makePatch(deck.deck_id, deck.version, [
      { op: "update_slide_fields", slide_id: "s001", fields: { title: "Changed" } },
    ]);

    engine.applyPatch(deck, patch);
    expect(deck.version).toBe(2);
    expect(deck.updated_at).not.toBe(oldUpdatedAt);
  });

  it("should reject patch that produces invalid deck", () => {
    const deck = makeFixture();
    const patch = makePatch(deck.deck_id, deck.version, [
      { op: "replace_slide", slide_id: "s001", slide: { type: "title", title: "" } }, // empty title
    ]);
    expect(() => engine.applyPatch(deck, patch)).toThrow();
  });
});
