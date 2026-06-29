import { Slide, SlideSchema } from "../schema/deck.schema.js";
import { RuleBasedLLMClient } from "./rule-based-client.js";
import { LLMClient } from "./llm-client.js";
import { repairJson, extractJson } from "./json-repair.js";
import { Storyline, StorylineInput } from "../runtime/storyline-planner.js";
import { Deck } from "../schema/deck.schema.js";
import { DeckGeneratorInput } from "./llm-client.js";

interface DeepSeekConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

function getConfig(): DeepSeekConfig {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY environment variable is required");
  return {
    apiKey,
    baseUrl: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com/v1",
    model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
  };
}

export class DeepSeekLLMClient implements LLMClient {
  readonly name = "deepseek";
  private fallback: RuleBasedLLMClient;

  constructor() {
    this.fallback = new RuleBasedLLMClient();
  }

  async generateStoryline(input: StorylineInput): Promise<Storyline> {
    // V0.4: fallback to rule-based for storyline
    return this.fallback.generateStoryline(input);
  }

  async generateDeck(input: DeckGeneratorInput): Promise<Deck> {
    // V0.4: fallback to rule-based for deck generation
    return this.fallback.generateDeck(input);
  }

  async generatePatch(slide: Slide, instruction: string, topic: string): Promise<Slide> {
    try {
      const config = getConfig();
      const prompt = this.buildPrompt(slide, instruction, topic);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

      const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.1,
          max_tokens: 4096,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        console.error(`[DeepSeek] API error: ${response.status} ${response.statusText}`);
        return this.fallback.generatePatch(slide, instruction, topic);
      }

      const data: any = await response.json();
      const raw = data?.choices?.[0]?.message?.content || "";

      // Attempt to parse JSON
      const parsed = this.parseSlideJson(raw);
      if (parsed) {
        // Validate against SlideSchema
        const validation = SlideSchema.safeParse(parsed);
        if (validation.success) {
          // Ensure slide_id is preserved
          if (!validation.data.slide_id) {
            return { ...validation.data, slide_id: slide.slide_id } as Slide;
          }
          return validation.data as Slide;
        }
        console.error("[DeepSeek] Schema validation failed, falling back:", validation.error.issues);
      } else {
        console.error("[DeepSeek] JSON parsing failed, falling back");
      }

      return this.fallback.generatePatch(slide, instruction, topic);
    } catch (err: any) {
      if (err.name === "AbortError") {
        console.error("[DeepSeek] Request timed out, falling back");
      } else {
        console.error(`[DeepSeek] Error: ${err.message}, falling back`);
      }
      return this.fallback.generatePatch(slide, instruction, topic);
    }
  }

  private buildPrompt(slide: Slide, instruction: string, topic: string): string {
    return `You are a presentation slide editor. Given an existing slide and an edit instruction, generate a replacement slide as valid JSON.

Existing slide (JSON):
${JSON.stringify(slide, null, 2)}

Edit instruction: ${instruction}
Topic: ${topic}

Output ONLY a valid JSON object for the replacement slide. Do NOT include any markdown formatting, code fences, or explanatory text. The JSON must match the Slide schema.

Important rules:
- Keep the same slide_id as the existing slide
- The "type" field determines the slide structure:
  - "title": { slide_id, type: "title", title, subtitle?, author?, date? }
  - "agenda": { slide_id, type: "agenda", title, items: [{label, description?}] }
  - "insight": { slide_id, type: "insight", title, key_points: string[], evidence?: [{label, value?, description?}] }
  - "comparison": { slide_id, type: "comparison", title, left: {title, points}, right: {title, points}, conclusion? }
  - "architecture": { slide_id, type: "architecture", title, layers: [{name, components}] }
  - "summary": { slide_id, type: "summary", title, takeaways: string[], next_steps?: string[] }
  - "roadmap": { slide_id, type: "roadmap", title, phases: [{name, timeline?, status: "planned"|"in_progress"|"completed"}] }
  - "timeline": { slide_id, type: "timeline", title, events: [{date, title, description?}] }
  - "case_study": { slide_id, type: "case_study", title, context, challenge, solution, results: string[], metrics?: [{label, value}] }
- Output ONLY the raw JSON. No backticks, no markdown.`;
  }

  private parseSlideJson(raw: string): Record<string, unknown> | null {
    // Try repairJson first (handles trailing commas, code fences)
    const repaired = repairJson<Record<string, unknown>>(raw);
    if (repaired) return repaired;

    // Try extractJson for cases where LLM adds explanatory text
    const extracted = extractJson(raw);
    if (extracted) {
      try {
        return JSON.parse(extracted) as Record<string, unknown>;
      } catch { /* continue */ }
    }

    return null;
  }
}
