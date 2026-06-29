/**
 * Prompt templates for LLM-based generation.
 * V0.3: Templates are defined but not yet used (rule-based is default).
 * V0.4+: Will be used with real LLM providers.
 */

export interface SystemPromptParams {
  role: "storyline_planner" | "deck_generator" | "slide_editor";
}

export function renderSystemPrompt(params: SystemPromptParams): string {
  switch (params.role) {
    case "storyline_planner":
      return `You are a presentation storyline planner. Given a topic, audience, and purpose, generate a structured storyline with slide types and narrative flow. Output JSON.`;
    case "deck_generator":
      return `You are a presentation deck generator. Given a storyline and topic, generate a complete Deck JSON with all slides. Output valid JSON matching the Deck schema.`;
    case "slide_editor":
      return `You are a presentation slide editor. Given an existing slide and an edit instruction, generate the replacement slide. Output valid JSON matching the Slide schema.`;
  }
}

export interface StorylinePromptParams {
  topic: string;
  audience?: string;
  purpose?: string;
  research_brief?: string;
  slide_count: number;
}

export function renderStorylinePrompt(params: StorylinePromptParams): string {
  return `Generate a presentation storyline.
Topic: ${params.topic}
Audience: ${params.audience || "General"}
Purpose: ${params.purpose || "Technical report"}
Slide count: ${params.slide_count}
${params.research_brief ? `Research brief: ${params.research_brief}` : ""}

Output a JSON object with:
- title: string
- narrative: string
- sections: array of { title, message, suggested_slide_types[] }`;
}

export function renderDeckPrompt(topic: string, storylineJson: string, styleId: string): string {
  return `Generate a Deck JSON for topic "${topic}" with style "${styleId}" based on this storyline:

${storylineJson}

Output a valid Deck JSON object with all slides populated.`;
}

export function renderPatchPrompt(slideJson: string, instruction: string, topic: string): string {
  return `Edit this slide based on the instruction.

Slide:
${slideJson}

Instruction: ${instruction}
Topic: ${topic}

Output the replacement slide as valid JSON.`;
}
