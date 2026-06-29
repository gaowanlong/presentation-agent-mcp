import * as fs from "node:fs/promises";
import * as path from "node:path";
import { Deck } from "../schema/deck.schema.js";
import { DeckPatch } from "../patch/deck-patch.schema.js";
import { AppError, ErrorCodes } from "../utils/errors.js";
import { ArtifactStore, ExportArtifact } from "./artifact-store.js";

const DATA_DIR = path.resolve(process.cwd(), "data");
const DECKS_DIR = path.join(DATA_DIR, "decks");
const EXPORTS_DIR = path.join(DATA_DIR, "exports");
const PATCHES_DIR = path.join(DATA_DIR, "patches");

async function ensureDir(dir: string): Promise<void> {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch {
    // ignore if already exists
  }
}

function deckPatchesDir(deckId: string): string {
  return path.join(PATCHES_DIR, deckId);
}

function patchFilePath(deckId: string, patchId: string): string {
  return path.join(deckPatchesDir(deckId), `${patchId}.json`);
}

export class LocalArtifactStore implements ArtifactStore {
  constructor() {
    ensureDir(DECKS_DIR);
    ensureDir(EXPORTS_DIR);
    ensureDir(PATCHES_DIR);
  }

  // ── Decks ───────────────────────────────────────────────────────────────

  private deckPath(deckId: string): string {
    return path.join(DECKS_DIR, `${deckId}.json`);
  }

  async deckExists(deckId: string): Promise<boolean> {
    try {
      await fs.access(this.deckPath(deckId));
      return true;
    } catch {
      return false;
    }
  }

  async saveDeck(deck: Deck): Promise<void> {
    await ensureDir(DECKS_DIR);
    await fs.writeFile(this.deckPath(deck.deck_id), JSON.stringify(deck, null, 2), "utf-8");
  }

  async loadDeck(deckId: string): Promise<Deck> {
    try {
      const data = await fs.readFile(this.deckPath(deckId), "utf-8");
      return JSON.parse(data) as Deck;
    } catch (err: any) {
      if (err?.code === "ENOENT") {
        throw new AppError(ErrorCodes.DECK_NOT_FOUND, `Deck "${deckId}" not found`);
      }
      throw new AppError(ErrorCodes.STORAGE_FAILED, `Failed to load deck: ${err?.message ?? String(err)}`);
    }
  }

  // ── Exports ─────────────────────────────────────────────────────────────

  async saveExport(exportArtifact: ExportArtifact, buffer: Buffer): Promise<void> {
    await ensureDir(EXPORTS_DIR);
    await fs.writeFile(exportArtifact.file_path, buffer);
  }

  getExportPath(exportId: string): string {
    return path.join(EXPORTS_DIR, `${exportId}.pptx`);
  }

  // ── Patches ─────────────────────────────────────────────────────────────

  async savePatch(patch: DeckPatch): Promise<void> {
    const dir = deckPatchesDir(patch.deck_id);
    await ensureDir(dir);
    await fs.writeFile(patchFilePath(patch.deck_id, patch.patch_id), JSON.stringify(patch, null, 2), "utf-8");
  }

  async loadPatch(deckId: string, patchId: string): Promise<DeckPatch> {
    try {
      const data = await fs.readFile(patchFilePath(deckId, patchId), "utf-8");
      return JSON.parse(data) as DeckPatch;
    } catch (err: any) {
      if (err?.code === "ENOENT") {
        throw new AppError(ErrorCodes.DECK_NOT_FOUND, `Patch "${patchId}" not found for deck "${deckId}"`);
      }
      throw new AppError(ErrorCodes.STORAGE_FAILED, `Failed to load patch: ${err?.message ?? String(err)}`);
    }
  }

  async listPatches(deckId: string): Promise<DeckPatch[]> {
    const dir = deckPatchesDir(deckId);
    try {
      const entries = await fs.readdir(dir);
      const patches: DeckPatch[] = [];
      for (const entry of entries) {
        if (!entry.endsWith(".json")) continue;
        const data = await fs.readFile(path.join(dir, entry), "utf-8");
        patches.push(JSON.parse(data) as DeckPatch);
      }
      patches.sort((a, b) => a.old_version - b.old_version);
      return patches;
    } catch {
      return [];
    }
  }

  async hasPatches(deckId: string): Promise<boolean> {
    try {
      const entries = await fs.readdir(deckPatchesDir(deckId));
      return entries.some((e) => e.endsWith(".json"));
    } catch {
      return false;
    }
  }
}
