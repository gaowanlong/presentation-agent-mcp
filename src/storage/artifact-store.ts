import { Deck } from "../schema/deck.schema.js";
import { DeckPatch } from "../patch/deck-patch.schema.js";

export interface ExportArtifact {
  export_id: string;
  deck_id: string;
  format: string;
  file_path: string;
  created_at: string;
}

export interface ArtifactStore {
  saveDeck(deck: Deck): Promise<void>;
  loadDeck(deckId: string): Promise<Deck>;
  saveExport(exportArtifact: ExportArtifact, buffer: Buffer): Promise<void>;
  getExportPath(exportId: string): string;
  deckExists(deckId: string): Promise<boolean>;

  /** Save a patch to storage under data/patches/{deck_id}/{patch_id}.json */
  savePatch(patch: DeckPatch): Promise<void>;

  /** Load a single patch by deck_id and patch_id */
  loadPatch(deckId: string, patchId: string): Promise<DeckPatch>;

  /** List all patches for a given deck, sorted by version ascending */
  listPatches(deckId: string): Promise<DeckPatch[]>;

  /** Check if patches directory exists for a deck */
  hasPatches(deckId: string): Promise<boolean>;
}
