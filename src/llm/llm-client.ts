import { Slide } from "../schema/deck.schema.js";
import { Storyline, StorylineInput } from "../runtime/storyline-planner.js";
import { Deck } from "../schema/deck.schema.js";

export interface DeckGeneratorInput {
  topic: string;
  audience?: string;
  purpose?: string;
  research_brief?: string;
  slide_count: number;
  style_id: string;
  storyline: Storyline;
}

export interface LLMClient {
  readonly id: string;
  validateConfiguration(): Promise<void>;
  /** Display name for the provider. */
  readonly name: string;

  /** Generate a storyline from a topic description. */
  generateStoryline(input: StorylineInput): Promise<Storyline>;

  /** Generate a deck from a storyline + topic. */
  generateDeck(input: DeckGeneratorInput): Promise<Deck>;

  /**
   * Generate a replacement slide based on an instruction.
   * Returns the new slide (the caller wraps it in a DeckPatch).
   */
  generatePatch(slide: Slide, instruction: string, topic: string): Promise<Slide>;
}
