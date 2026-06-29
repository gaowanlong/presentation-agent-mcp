import { Deck, CreateDeckInputSchema } from "../schema/deck.schema.js";
import { StyleProfile, CreateStyleProfileInputSchema } from "../schema/style.schema.js";
import { ReviewResult, ReviewDeckInputSchema } from "../schema/review.schema.js";
import { ArtifactStore } from "../storage/artifact-store.js";
import { generateStoryline, Storyline } from "./storyline-planner.js";
import { generateDeck } from "./deck-generator.js";
import { LayoutEngine } from "../layout/layout-engine.js";
import { ReviewEngine } from "./review-engine.js";
import { IncrementalEditor, UpdateSlideInput, UpdateSlideResult } from "./incremental-editor.js";
import { PptxExporter } from "../export/pptx-exporter.js";
import { PdfExporter } from "../export/pdf-exporter.js";
import { PatchEngine } from "../patch/patch-engine.js";
import { AutoFixEngine, AutoFixResult } from "../autofix/auto-fix-engine.js";
import type { LLMClient } from "../llm/llm-client.js";
import { DeckPatch } from "../patch/deck-patch.schema.js";
import { getStyleById } from "../styles/index.js";
import { generateId } from "../utils/ids.js";

export interface CreateStorylineInput { topic: string; audience?: string; purpose?: string; research_brief?: string; slide_count?: number; }
export interface ExportResult { deck_id: string; export_id: string; file_path: string; format: string; download_url?: string; }

export class PresentationRuntime {
  private patchEngine: PatchEngine;
  private autoFixEngine: AutoFixEngine;
  private hostPort: string = "";

  constructor(
    private store: ArtifactStore,
    private layoutEngine: LayoutEngine,
    private reviewEngine: ReviewEngine,
    private incrementalEditor: IncrementalEditor,
    private pptxExporter: PptxExporter,
    private pdfExporter?: PdfExporter
  ) {
    this.patchEngine = new PatchEngine();
    this.autoFixEngine = new AutoFixEngine();
  }

  /** Set the host:port for generating download URLs in remote mode. */
  setHostPort(hostPort: string): void { this.hostPort = hostPort; }

  getPatchEngine(): PatchEngine { return this.patchEngine; }
  getReviewEngine(): ReviewEngine { return this.reviewEngine; }

  async createStyleProfile(input: { style_id?: string }): Promise<StyleProfile> {
    const parsed = CreateStyleProfileInputSchema.parse(input);
    return getStyleById(parsed.style_id);
  }

  async createStoryline(input: CreateStorylineInput): Promise<Storyline> {
    return generateStoryline({ topic: input.topic, audience: input.audience, purpose: input.purpose, research_brief: input.research_brief, slide_count: input.slide_count ?? 8 });
  }

  async createDeck(input: { topic: string; audience?: string; purpose?: string; research_brief?: string; slide_count?: number; style_id?: string; }): Promise<Deck> {
    const parsed = CreateDeckInputSchema.parse(input);
    const storyline = generateStoryline({ topic: parsed.topic, audience: parsed.audience, purpose: parsed.purpose, research_brief: parsed.research_brief, slide_count: parsed.slide_count });
    const deck = generateDeck({ topic: parsed.topic, audience: parsed.audience, purpose: parsed.purpose, research_brief: parsed.research_brief, slide_count: parsed.slide_count, style_id: parsed.style_id, storyline });
    await this.store.saveDeck(deck);
    return deck;
  }

  async getDeck(deckId: string): Promise<Deck> { return this.store.loadDeck(deckId); }

  async reviewDeck(deckId: string): Promise<ReviewResult> {
    return this.reviewEngine.review(await this.store.loadDeck(deckId));
  }

  async updateSlide(input: UpdateSlideInput): Promise<UpdateSlideResult> {
    const deck = await this.store.loadDeck(input.deck_id);
    const result = await this.incrementalEditor.updateSlide(deck, input);
    await this.store.saveDeck(deck);
    await this.store.savePatch(result.patch);
    return result;
  }

  async applyPatch(deckId: string, patchInput: { operations: any[]; description?: string }): Promise<{ patch: DeckPatch; review: ReviewResult }> {
    const deck = await this.store.loadDeck(deckId);
    const patch: DeckPatch = {
      patch_id: generateId("patch"), deck_id: deckId, description: patchInput.description || "Manual patch",
      old_version: deck.version, new_version: deck.version + 1,
      operations: patchInput.operations, created_at: new Date().toISOString(),
    };
    this.patchEngine.applyPatch(deck, patch);
    await this.store.saveDeck(deck);
    await this.store.savePatch(patch);
    return { patch, review: this.reviewEngine.review(deck) };
  }

  async listPatches(deckId: string): Promise<DeckPatch[]> { return this.store.listPatches(deckId); }

  async autoFixDeck(deckId: string): Promise<AutoFixResult> {
    const deck = await this.store.loadDeck(deckId);
    const result = this.autoFixEngine.autoFix(deck);
    await this.store.saveDeck(deck);
    for (const p of result.patches) {
      await this.store.savePatch(p);
    }
    return result;
  }

  async exportPptx(deckId: string): Promise<ExportResult> {
    const deck = await this.store.loadDeck(deckId);
    const buffer = await this.pptxExporter.export(deck);
    const exportId = generateId("export");
    const filePath = this.store.getExportPath(exportId);
    await this.store.saveExport({ export_id: exportId, deck_id: deckId, format: "pptx", file_path: filePath, created_at: new Date().toISOString() }, buffer);
    return {
      deck_id: deckId, export_id: exportId, file_path: filePath, format: "pptx",
      download_url: this.hostPort ? `http://${this.hostPort}/artifacts/${exportId}` : undefined,
    };
  }

  async exportPdf(deckId: string): Promise<ExportResult> {
    if (!this.pdfExporter) throw new Error("PDF exporter not configured");
    const deck = await this.store.loadDeck(deckId);
    const buffer = await this.pdfExporter.export(deck);
    const exportId = generateId("export");
    const filePath = this.store.getExportPath(exportId).replace(".pptx", ".pdf");
    await this.store.saveExport({ export_id: exportId, deck_id: deckId, format: "pdf", file_path: filePath, created_at: new Date().toISOString() }, buffer);
    return {
      deck_id: deckId, export_id: exportId, file_path: filePath, format: "pdf",
      download_url: this.hostPort ? `http://${this.hostPort}/artifacts/${exportId}` : undefined,
    };
  }
}
