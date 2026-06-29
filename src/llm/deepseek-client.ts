import { Slide, SlideSchema, DeckSchema, Deck } from "../schema/deck.schema.js";
import { RuleBasedLLMClient } from "./rule-based-client.js";
import { LLMClient, DeckGeneratorInput } from "./llm-client.js";
import { repairJson, extractJson } from "./json-repair.js";
import { Storyline, StorylineInput, StorylineSection } from "../runtime/storyline-planner.js";
import { generateId } from "../utils/ids.js";

interface DeepSeekConfig {
  apiKey: string; baseUrl: string; model: string;
}
function getConfig(): DeepSeekConfig {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY required");
  return {
    apiKey,
    baseUrl: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com/v1",
    model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
  };
}

export class DeepSeekLLMClient implements LLMClient {
  readonly name = "deepseek";
  private fallback: RuleBasedLLMClient;

  constructor() { this.fallback = new RuleBasedLLMClient(); }

  // ── generateStoryline ─────────────────────────────────────────────

  async generateStoryline(input: StorylineInput): Promise<Storyline> {
    try {
      const config = getConfig();
      const prompt = this.buildStorylinePrompt(input);
      const raw = await this.callLLM(config, prompt);
      if (!raw) return this.fallback.generateStoryline(input);

      const parsed = this.parseJson<Record<string, unknown>>(raw);
      if (!parsed) return this.fallback.generateStoryline(input);

      const storyline = this.validateStoryline(parsed, input.topic);
      if (storyline) return storyline;

      return this.fallback.generateStoryline(input);
    } catch {
      return this.fallback.generateStoryline(input);
    }
  }

  // ── generateDeck ──────────────────────────────────────────────────

  async generateDeck(input: DeckGeneratorInput): Promise<Deck> {
    try {
      const config = getConfig();
      const prompt = this.buildDeckPrompt(input);
      const raw = await this.callLLM(config, prompt);
      if (!raw) return this.fallback.generateDeck(input);

      const parsed = this.parseJson<Record<string, unknown>>(raw);
      if (!parsed) return this.fallback.generateDeck(input);

      // Validate with DeckSchema
      const validation = DeckSchema.safeParse(parsed);
      if (validation.success) return validation.data;

      console.error("[DeepSeek] Deck schema validation failed, falling back:", validation.error.issues);
      return this.fallback.generateDeck(input);
    } catch {
      return this.fallback.generateDeck(input);
    }
  }

  // ── generatePatch ─────────────────────────────────────────────────

  async generatePatch(slide: Slide, instruction: string, topic: string): Promise<Slide> {
    try {
      const config = getConfig();
      const prompt = this.buildPatchPrompt(slide, instruction, topic);
      const raw = await this.callLLM(config, prompt);
      if (!raw) return this.fallback.generatePatch(slide, instruction, topic);

      const parsed = this.parseJson<Record<string, unknown>>(raw);
      if (!parsed) return this.fallback.generatePatch(slide, instruction, topic);

      const validation = SlideSchema.safeParse(parsed);
      if (validation.success) {
        const s = validation.data;
        return s.slide_id ? s : { ...s, slide_id: slide.slide_id } as Slide;
      }

      console.error("[DeepSeek] Patch schema validation failed, falling back:", validation.error.issues);
      return this.fallback.generatePatch(slide, instruction, topic);
    } catch {
      return this.fallback.generatePatch(slide, instruction, topic);
    }
  }

  // ── Shared API call ───────────────────────────────────────────────

  private async callLLM(config: DeepSeekConfig, prompt: string): Promise<string | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${config.apiKey}` },
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
        console.error(`[DeepSeek] API error: ${response.status}`);
        return null;
      }

      const data: any = await response.json();
      return data?.choices?.[0]?.message?.content || null;
    } catch (err: any) {
      clearTimeout(timeout);
      if (err.name === "AbortError") console.error("[DeepSeek] Timeout");
      else console.error(`[DeepSeek] Error: ${err.message}`);
      return null;
    }
  }

  // ── JSON parsing ──────────────────────────────────────────────────

  private parseJson<T>(raw: string): T | null {
    const repaired = repairJson<T>(raw);
    if (repaired) return repaired;
    const extracted = extractJson(raw);
    if (extracted) { try { return JSON.parse(extracted) as T; } catch { /* noop */ } }
    return null;
  }

  // ── Storyline validation ──────────────────────────────────────────

  private validateStoryline(parsed: Record<string, unknown>, topic: string): Storyline | null {
    if (!parsed.title || !Array.isArray(parsed.sections)) return null;
    const sections: StorylineSection[] = parsed.sections.map((s: any, i: number) => ({
      title: s.title || `Section ${i + 1}`,
      message: s.message || "",
      suggested_slide_types: Array.isArray(s.suggested_slide_types) ? s.suggested_slide_types : ["insight"],
    }));
    if (sections.length < 2) return null;
    return {
      storyline_id: String(parsed.storyline_id || generateId("storyline")),
      title: String(parsed.title || ""),
      narrative: String(parsed.narrative || topic || ""),
      sections,
    };
  }

  // ── Prompts ───────────────────────────────────────────────────────

  private buildStorylinePrompt(input: StorylineInput): string {
    return `You are a presentation storyline planner. Generate a structured storyline as valid JSON.

Output ONLY a JSON object like:
{
  "storyline_id": "storyline_xxx",
  "title": "Presentation Title",
  "narrative": "Overview narrative",
  "sections": [
    {"title": "Section Title", "message": "Section message", "suggested_slide_types": ["insight"]}
  ]
}

Available slide types: title, agenda, insight, comparison, architecture, summary, roadmap, timeline, case_study

Topic: ${input.topic}
Audience: ${input.audience || "General"}
Purpose: ${input.purpose || "Technical report"}
Slide count: ${input.slide_count}
${input.research_brief ? `Research brief: ${input.research_brief.substring(0, 500)}` : ""}

Rules:
- Generate exactly ${input.slide_count} sections
- First section must have type "title"
- Second section must have type "agenda"
- Last section must have type "summary"
- Include at least one "architecture" and one "comparison" section
- Include "insight" sections for technical content
- Use clear, descriptive section titles
- Output ONLY the raw JSON. No backticks, no markdown.`;
  }

  private buildDeckPrompt(input: DeckGeneratorInput): string {
    return `You are a presentation deck generator. Generate a complete Deck JSON based on the storyline below.

Output ONLY a valid JSON object for the Deck. The Deck schema has:
{
  "deck_id": "deck_xxx",
  "version": 1,
  "title": "...",
  "subtitle": "...",
  "topic": "...",
  "style_id": "...",
  "slides": [...]
}

Slide type structures:
- title: {slide_id, type:"title", title, subtitle?, author?, date?}
- agenda: {slide_id, type:"agenda", title, items:[{label, description?}]}
- insight: {slide_id, type:"insight", title, key_points:string[], evidence?:[{label, value?, description?}]}
- comparison: {slide_id, type:"comparison", title, left:{title,points}, right:{title,points}, conclusion?}
- architecture: {slide_id, type:"architecture", title, layers:[{name, components}]}
- summary: {slide_id, type:"summary", title, takeaways:string[], next_steps?:string[]}
- roadmap: {slide_id, type:"roadmap", title, phases:[{name, timeline?, status}]}
- timeline: {slide_id, type:"timeline", title, events:[{date, title, description?}]}
- case_study: {slide_id, type:"case_study", title, context, challenge, solution, results:string[], metrics?:[{label, value}]}

IMPORTANT: Do NOT include layout coordinates (x, y, w, h) in any output.

Topic: ${input.topic}
Style: ${input.style_id}

Storyline:
${JSON.stringify(input.storyline, null, 2)}

Generate slide_id values like "s001", "s002", etc.
Output ONLY the raw JSON. No backticks, no markdown.`;
  }

  private buildPatchPrompt(slide: Slide, instruction: string, topic: string): string {
    return `You are a presentation slide editor. Given an existing slide and an edit instruction, generate a replacement slide as valid JSON.

Existing slide (JSON):
${JSON.stringify(slide, null, 2)}

Edit instruction: ${instruction}
Topic: ${topic}

Output ONLY a valid JSON object for the replacement slide. Keep the same slide_id. Available types and their fields:
- title: {slide_id, type:"title", title, subtitle?, author?, date?}
- agenda: {slide_id, type:"agenda", title, items:[{label, description?}]}
- insight: {slide_id, type:"insight", title, key_points:string[], evidence?:[{label, value?, description?}]}
- comparison: {slide_id, type:"comparison", title, left:{title,points}, right:{title,points}, conclusion?}
- architecture: {slide_id, type:"architecture", title, layers:[{name, components}]}
- summary: {slide_id, type:"summary", title, takeaways:string[], next_steps?:string[]}
- roadmap: {slide_id, type:"roadmap", title, phases:[{name, timeline?, status}]}
- timeline: {slide_id, type:"timeline", title, events:[{date, title, description?}]}
- case_study: {slide_id, type:"case_study", title, context, challenge, solution, results:string[], metrics?:[{label, value}]}

Output ONLY the raw JSON. No backticks, no markdown.`;
  }
}
