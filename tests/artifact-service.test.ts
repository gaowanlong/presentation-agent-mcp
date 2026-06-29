import { describe, it, expect, beforeEach } from "vitest";
import { ArtifactService } from "../src/artifact/artifact-service.js";
import { ArtifactStore, ExportArtifact } from "../src/storage/artifact-store.js";
import { Deck } from "../src/schema/deck.schema.js";

class MockStore implements ArtifactStore {
  exports: Map<string, Buffer> = new Map();
  decks: Map<string, Deck> = new Map();
  patches: any[] = [];

  async saveDeck(deck: Deck): Promise<void> { this.decks.set(deck.deck_id, deck); }
  async loadDeck(deckId: string): Promise<Deck> {
    const d = this.decks.get(deckId);
    if (!d) throw new Error("Not found");
    return d;
  }
  async saveExport(artifact: ExportArtifact, buffer: Buffer): Promise<void> {
    this.exports.set(artifact.export_id, buffer);
  }
  getExportPath(exportId: string): string { return `/mock/path/${exportId}.pptx`; }
  deckExists(deckId: string): Promise<boolean> { return Promise.resolve(this.decks.has(deckId)); }
  async savePatch(patch: any): Promise<void> { this.patches.push(patch); }
  async loadPatch(deckId: string, patchId: string): Promise<any> {
    return this.patches.find((p: any) => p.patch_id === patchId && p.deck_id === deckId);
  }
  async listPatches(deckId: string): Promise<any[]> {
    return this.patches.filter((p: any) => p.deck_id === deckId);
  }
  async hasPatches(deckId: string): Promise<boolean> {
    return this.patches.some((p: any) => p.deck_id === deckId);
  }
}

describe("ArtifactService", () => {
  let store: MockStore;
  let svc: ArtifactService;

  beforeEach(() => {
    store = new MockStore();
    svc = new ArtifactService(store);
  });

  it("should create a PPTX artifact with metadata", async () => {
    const buffer = Buffer.from("fake pptx content");
    const artifact = await svc.createArtifact("deck_001", "pptx", buffer);

    expect(artifact.artifact_id).toMatch(/^artifact_/);
    expect(artifact.deck_id).toBe("deck_001");
    expect(artifact.format).toBe("pptx");
    expect(artifact.mime_type).toBe("application/vnd.openxmlformats-officedocument.presentationml.presentation");
    expect(artifact.size_bytes).toBe(buffer.length);
    expect(artifact.file_path).toMatch(/\.pptx$/);
    expect(artifact.created_at).toBeTruthy();
  });

  it("should create a PDF artifact with metadata", async () => {
    const buffer = Buffer.from("fake pdf content");
    const artifact = await svc.createArtifact("deck_001", "pdf", buffer);

    expect(artifact.format).toBe("pdf");
    expect(artifact.mime_type).toBe("application/pdf");
    expect(artifact.file_path).toMatch(/\.pdf$/);
  });

  it("should include download URL when hostPort is provided", async () => {
    const buffer = Buffer.from("content");
    const artifact = await svc.createArtifact("deck_001", "pptx", buffer, "localhost:3000");

    expect(artifact.download_url).toBe(`http://localhost:3000/artifacts/${artifact.artifact_id}`);
  });

  it("should omit download URL when hostPort is not provided", async () => {
    const buffer = Buffer.from("content");
    const artifact = await svc.createArtifact("deck_001", "pptx", buffer);

    expect(artifact.download_url).toBeUndefined();
  });

  it("should persist artifact data via the store", async () => {
    const buffer = Buffer.from("content");
    const artifact = await svc.createArtifact("deck_001", "pptx", buffer);

    expect(store.exports.has(artifact.artifact_id)).toBe(true);
    const saved = store.exports.get(artifact.artifact_id)!;
    expect(saved.toString()).toBe("content");
  });
});
