# Production Presentation Pipeline Design

## Goal

Replace the rule-template production path with one configurable, provider-backed presentation pipeline that produces source-grounded content, uses the V0.9 layout/visual/design capabilities, propagates runtime context correctly, and refuses to export decks that fail quality gates.

The existing MCP tool names and Deck JSON remain compatible unless a change is explicitly described below.

## Scope

This design covers:

- a pluggable and configurable LLM provider contract;
- strict production configuration with no silent rule-based fallback;
- structured research parsing and source-aware content generation;
- one authoritative generation path shared by MCP and `codex-agent`;
- integration of layout, visual, and design planning into PPTX export;
- agent context propagation for `deck_id` and semantic slide IDs;
- content, layout, render, and factual quality gates;
- automated unit, integration, and rendered-deck regression tests.

It does not cover a web editor, collaborative authoring, animation, template marketplace, or a complete replacement of the public Deck schema.

## Architecture

The authoritative production path is:

```text
MCP create_deck
  -> ProviderRegistry
  -> ResearchParser
  -> StorylineService
  -> DeckService
  -> LayoutPlanner
  -> VisualPlanner
  -> DesignEngine
  -> ReviewEngine / AutoFix
  -> PptxExporter
  -> RenderQualityGate
```

`PresentationRuntime` owns this orchestration. `codex-agent` calls the same MCP/runtime operations and does not maintain a separate generation implementation.

The existing deterministic client remains available only when an explicit test or development configuration selects it. Production startup and `create_deck` reject missing, unknown, or invalid provider configuration.

## LLM Provider Contract

Introduce an `LLMProvider` interface with:

```ts
interface LLMProvider {
  readonly id: string;
  validateConfiguration(): Promise<void>;
  generateStoryline(input: StorylineInput): Promise<Storyline>;
  generateDeck(input: DeckGeneratorInput): Promise<Deck>;
  generatePatch(slide: Slide, instruction: string, topic: string): Promise<Slide>;
}
```

A `ProviderRegistry`:

- registers provider factories by stable ID;
- resolves the configured provider from `LLM_PROVIDER`;
- validates provider configuration before generation;
- rejects missing or unknown providers with actionable errors;
- never catches a provider failure and substitutes a different provider.

DeepSeek is the first production implementation. Its configuration uses `DEEPSEEK_API_KEY`, `DEEPSEEK_BASE_URL`, and `DEEPSEEK_MODEL`. Future providers can be added without modifying `PresentationRuntime`.

Provider calls may retry transient timeout, rate-limit, and server errors within a small bounded policy. Authentication, schema, and content-validation failures are not retried. API keys must never appear in traces or returned errors.

## Research Model and Parsing

Research input is parsed into a structured artifact containing:

- document title and metadata;
- ordered sections with heading level, title, and body;
- section-level findings and implications;
- data points with metric, value, surrounding context, and source reference;
- architecture components and explicitly stated relationships;
- roadmap phases and timeframes;
- sources with title, URL when available, and source location.

The parser processes the complete supplied report. Evaluation and runtime code must not truncate the report to an arbitrary character prefix.

The provider receives a compact structured representation. Chunking may be used for provider context limits, but every chunk is summarized into the same artifact before storyline generation.

## Storyline and Deck Generation

The storyline is derived from the research structure, audience, and purpose. It is not a fixed title/agenda/comparison/architecture/summary template.

Each planned slide includes:

- a semantic role;
- one assertion-style message;
- the research sections and sources it owns;
- an intended layout family;
- content and density budgets;
- optional visual intent.

Deck generation must satisfy:

- one primary message per slide;
- no duplicate body content across slides;
- agenda and summary derived from the actual storyline;
- numeric claims linked to supplied research sources;
- no invented numbers or benchmark results;
- layout-specific content budgets;
- stable semantic roles used to resolve real slide IDs after creation.

Cross-slide validation checks normalized content similarity and source ownership. Duplicate or unsupported content is repaired once through the configured provider. If it remains invalid, deck creation fails.

## Layout, Visual, and Design Integration

The V0.9 components become part of the production path through adapters between Deck slides and renderable layout elements.

### Layout

`LayoutPlanner` chooses a layout family from slide role, content shape, and visual intent. It is not limited to a fixed eight-slide plan.

Text sizing uses estimated wrapped line counts and layout budgets. When content does not fit, the order of operations is:

1. condense wording without changing the claim;
2. split content into another slide when the storyline permits;
3. reduce font size only down to the configured minimum;
4. fail validation if content still does not fit.

### Visuals

`VisualPlanner` converts only explicit architecture relationships into nodes and edges. Chinese and English relationship phrases are supported. When relationships cannot be established reliably, it produces a layered component view without inferred edges.

The Deck and layout models support image, diagram, and chart render intents in addition to text and shapes. Source metadata is retained for external visual assets.

### Design

`DesignEngine` applies typography, palette, spacing, hierarchy, and alignment constraints without globally offsetting existing coordinates.

The default technical style uses:

- at least 35 pt for slide titles;
- at least 16 pt for body text;
- readable caption sizes appropriate to the target room and display;
- explicit PowerPoint fill transparency rather than eight-digit color strings;
- contrast ratios checked before export.

## Review, Repair, and Export Gates

Review expands beyond structural checks to include:

- duplicate or near-duplicate slide content;
- unsupported numeric claims;
- missing source attribution;
- content budget violations;
- element bounds and unintended overlaps;
- text fit and minimum font sizes;
- foreground/background contrast;
- page density and whitespace;
- unresolved placeholders;
- inconsistent page furniture.

Auto-fix receives strategies for content density, duplicate content, contrast, and supported layout adjustments. Auto-fix never invents facts or sources.

Export runs static preflight first. High-severity issues block export and return slide IDs, element IDs when available, and actionable messages.

The final verification stage renders every slide and runs render-level checks. A deck is delivered only after both static and rendered checks pass.

## Agent Context and Execution

Execution plan inputs may reference runtime context values. After `create_deck`, the engine stores:

- `deck_id`;
- the map from semantic slide roles to real `slide_id` values;
- the current deck version.

Before each dependent tool call, the engine resolves those references and injects the real values. `review_deck`, `auto_fix_deck`, and `export_pptx` always receive `deck_id`. `update_slide` resolves a semantic role to an existing real slide ID.

Critical steps do not use `fallback: skip`. Provider validation, deck creation, review, repair, and export failures terminate the run. Traces record provider ID, sanitized input summaries, resolved IDs, state transitions, and errors without credentials.

## Error Semantics

Use distinct error codes for:

- provider not configured;
- provider configuration invalid;
- provider request failed;
- provider response invalid;
- unsupported or ungrounded content;
- deck quality gate failed;
- layout quality gate failed;
- render quality gate failed;
- unresolved execution context.

MCP tool responses expose the code and a concise remediation message. Internal causes are retained for logs without leaking secrets.

## Testing Strategy

### Provider tests

- registry resolves the selected provider;
- missing, unknown, and invalid providers are rejected;
- DeepSeek request and response validation;
- transient retry behavior;
- no silent fallback.

### Content tests

- the complete research report is parsed;
- separate report sections produce distinct slides;
- numeric claims preserve source references;
- no report heading becomes a body bullet;
- duplicate slide content is rejected or repaired;
- agendas and summaries match the generated storyline.

### Agent tests

- `deck_id` reaches every dependent tool;
- semantic roles resolve to real slide IDs;
- critical failures terminate execution;
- traces contain sanitized context.

### Layout and export tests

- long content is condensed or split instead of overlapped;
- minimum font sizes are enforced;
- transparency and contrast are correct;
- diagrams contain only supported relationships;
- static preflight rejects overlaps and overflow;
- a real PPTX is generated, rendered, and inspected slide by slide.

### Regression requirement

The current seven failing tests must be corrected for valid behavioral reasons. Final acceptance requires:

- TypeScript type checking succeeds;
- the complete automated test suite succeeds;
- an end-to-end AgentOS deck is generated through the production provider path;
- every output slide is rendered;
- no high-severity static or render issue remains.

## Migration and Compatibility

Existing MCP tool names and required inputs stay stable. New optional inputs may select a provider or request strict quality details, but environment configuration remains the production default.

The legacy deterministic generators are retained temporarily for explicit tests. They are not the default provider and are not reachable through an unconfigured production startup.

The existing Deck JSON remains readable. New fields for semantic role, source ownership, and visual intent are optional so stored decks can still be loaded and edited.

## Delivery Sequence

1. Introduce provider registry and strict configuration.
2. Route Runtime storyline, deck, and patch generation through the provider.
3. Replace research truncation and first-sentence reuse with structured parsing.
4. Add content grounding and deduplication gates.
5. Fix Agent execution context and critical-step behavior.
6. Integrate adaptive layout, visuals, and design constraints.
7. Add static and rendered quality gates.
8. Generate and visually verify the AgentOS regression deck.
