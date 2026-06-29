# Production Presentation Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the rule-template production path with a strict, configurable LLM-provider pipeline that generates grounded content, uses the V0.9 design capabilities, propagates Agent context correctly, and blocks low-quality PPTX exports.

**Architecture:** Keep the MCP tools and Deck JSON compatible, but make `PresentationRuntime` orchestrate one provider-backed path. Parse research once into a structured artifact, pass it through storyline and deck generation, validate content before storage, adapt V0.9 layout/visual/design modules into the exporter, and enforce static plus rendered quality gates.

**Tech Stack:** TypeScript, Zod, Vitest, PptxGenJS, MCP TypeScript SDK, LibreOffice/Poppler rendering helpers.

---

## File Map

New files:

- `src/llm/provider-registry.ts` — provider registration, selection, and strict validation.
- `src/quality/content-quality-gate.ts` — duplicate, grounding, source, and density validation.
- `src/quality/layout-quality-gate.ts` — bounds, overlap, font, and contrast validation.
- `src/layout/v09-layout-adapter.ts` — bridge from Deck/layout elements to V0.9 design and visual intelligence.
- `src/autofix/fixes/text-too-dense.fix.ts` — deterministic content-budget repair.
- `tests/provider-registry.test.ts` — provider selection and rejection behavior.
- `tests/content-quality-gate.test.ts` — grounding and cross-slide validation.
- `tests/layout-quality-gate.test.ts` — static visual validation.
- `tests/helpers/deck-fixtures.ts` — valid Deck and slide fixtures shared by quality tests.
- `codex-agent/tests/execution-context.test.ts` — real ID/context propagation.

Modified files:

- `src/llm/llm-client.ts`
- `src/llm/deepseek-client.ts`
- `src/llm/rule-based-client.ts`
- `src/index.ts`
- `src/runtime/presentation-runtime.ts`
- `src/runtime/incremental-editor.ts`
- `src/research/research-artifact.schema.ts`
- `src/research/research-ingestor.ts`
- `src/runtime/storyline-planner.ts`
- `src/runtime/deck-generator.ts`
- `src/schema/deck.schema.ts`
- `src/schema/layout.schema.ts`
- `src/schema/review.schema.ts`
- `src/runtime/review-engine.ts`
- `src/autofix/auto-fix-engine.ts`
- `src/layout/layout-engine.ts`
- `src/layout/layout-utils.ts`
- `src/layout/layouts/insight.layout.ts`
- `src/layout/layouts/architecture.layout.ts`
- `src/export/pptx-exporter.ts`
- `src/export/pptx-theme.ts`
- `src/styles/allen-huawei-tech.ts`
- `codex-agent/planning/plan-mapper.ts`
- `codex-agent/core/context-store.ts`
- `codex-agent/core/execution-engine.ts`
- `codex-agent/types/execution-plan.ts`
- `codex-agent/visual/visual-planner.ts`
- `codex-agent/design/design-engine.ts`
- `eval/run-eval.ts`
- `examples/run-e2e.ts`
- affected runtime construction and existing tests.

## Task 1: Strict Pluggable Provider Registry

**Files:**

- Create: `src/llm/provider-registry.ts`
- Test: `tests/provider-registry.test.ts`
- Modify: `src/llm/llm-client.ts`
- Modify: `src/llm/rule-based-client.ts`
- Modify: `src/utils/errors.ts`

- [ ] **Step 1: Write failing provider-registry tests**

```ts
import { describe, expect, it } from "vitest";
import { ProviderRegistry } from "../src/llm/provider-registry.js";
import { AppError, ErrorCodes } from "../src/utils/errors.js";

describe("ProviderRegistry", () => {
  it("rejects missing provider configuration", async () => {
    const registry = new ProviderRegistry();
    await expect(registry.resolve("")).rejects.toMatchObject({
      code: ErrorCodes.PROVIDER_NOT_CONFIGURED,
    });
  });

  it("rejects an unknown provider", async () => {
    const registry = new ProviderRegistry();
    await expect(registry.resolve("unknown")).rejects.toMatchObject({
      code: ErrorCodes.PROVIDER_NOT_FOUND,
    });
  });

  it("returns a registered provider after validation", async () => {
    let validated = false;
    const provider = {
      id: "test",
      name: "test",
      validateConfiguration: async () => { validated = true; },
      generateStoryline: async () => { throw new Error("unused"); },
      generateDeck: async () => { throw new Error("unused"); },
      generatePatch: async () => { throw new Error("unused"); },
    };
    const registry = new ProviderRegistry().register("test", () => provider);
    expect(await registry.resolve("test")).toBe(provider);
    expect(validated).toBe(true);
  });
});
```

- [ ] **Step 2: Run the tests and verify RED**

Run:

```bash
npx vitest run tests/provider-registry.test.ts
```

Expected: FAIL because `provider-registry.ts` and provider error codes do not exist.

- [ ] **Step 3: Add the provider contract and error codes**

Update `src/llm/llm-client.ts`:

```ts
export interface LLMClient {
  readonly id: string;
  readonly name: string;
  validateConfiguration(): Promise<void>;
  generateStoryline(input: StorylineInput): Promise<Storyline>;
  generateDeck(input: DeckGeneratorInput): Promise<Deck>;
  generatePatch(slide: Slide, instruction: string, topic: string): Promise<Slide>;
}
```

Add to `ErrorCodes`:

```ts
PROVIDER_NOT_CONFIGURED: "PROVIDER_NOT_CONFIGURED",
PROVIDER_NOT_FOUND: "PROVIDER_NOT_FOUND",
PROVIDER_CONFIGURATION_INVALID: "PROVIDER_CONFIGURATION_INVALID",
PROVIDER_REQUEST_FAILED: "PROVIDER_REQUEST_FAILED",
PROVIDER_RESPONSE_INVALID: "PROVIDER_RESPONSE_INVALID",
CONTENT_QUALITY_FAILED: "CONTENT_QUALITY_FAILED",
LAYOUT_QUALITY_FAILED: "LAYOUT_QUALITY_FAILED",
RENDER_QUALITY_FAILED: "RENDER_QUALITY_FAILED",
EXECUTION_CONTEXT_UNRESOLVED: "EXECUTION_CONTEXT_UNRESOLVED",
```

- [ ] **Step 4: Implement the registry**

```ts
import type { LLMClient } from "./llm-client.js";
import { AppError, ErrorCodes } from "../utils/errors.js";

type ProviderFactory = () => LLMClient;

export class ProviderRegistry {
  private factories = new Map<string, ProviderFactory>();

  register(id: string, factory: ProviderFactory): this {
    this.factories.set(id, factory);
    return this;
  }

  async resolve(id: string | undefined): Promise<LLMClient> {
    if (!id?.trim()) {
      throw new AppError(
        ErrorCodes.PROVIDER_NOT_CONFIGURED,
        "LLM_PROVIDER must name a configured production provider"
      );
    }
    const factory = this.factories.get(id);
    if (!factory) {
      throw new AppError(
        ErrorCodes.PROVIDER_NOT_FOUND,
        `Unknown LLM provider "${id}"`
      );
    }
    const provider = factory();
    await provider.validateConfiguration();
    return provider;
  }
}
```

Give `RuleBasedLLMClient` `id = "rule-based"` and an empty `validateConfiguration()` method. It remains selectable only when tests or explicit development code register it.

- [ ] **Step 5: Run tests and verify GREEN**

Run:

```bash
npx vitest run tests/provider-registry.test.ts tests/llm-client.test.ts
```

Expected: all selected tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/llm/llm-client.ts src/llm/provider-registry.ts src/llm/rule-based-client.ts src/utils/errors.ts tests/provider-registry.test.ts
git commit -m "feat: add strict pluggable LLM provider registry"
```

## Task 2: Make DeepSeek Strict and Route Runtime Through the Provider

**Files:**

- Modify: `src/llm/deepseek-client.ts`
- Modify: `src/index.ts`
- Modify: `src/runtime/presentation-runtime.ts`
- Modify: `src/runtime/incremental-editor.ts`
- Modify: `tests/deepseek-client.test.ts`
- Modify: `tests/workflow-e2e.test.ts`
- Modify: `codex-agent/cli/run.ts`
- Modify: `eval/run-eval.ts`
- Modify: `examples/run-e2e.ts`
- Modify: `tests/acceptance-v0.4.test.ts`

- [ ] **Step 1: Replace fallback expectations with failing strict-provider tests**

Add assertions such as:

```ts
it("storyline: invalid JSON is rejected", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(mockResp("not json"));
  await expect(client.generateStoryline({ topic: "AI", slide_count: 6 }))
    .rejects.toMatchObject({ code: ErrorCodes.PROVIDER_RESPONSE_INVALID });
});

it("deck: API failure is rejected", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(mockErr());
  await expect(client.generateDeck({
    topic: "AI",
    slide_count: 6,
    style_id: "default",
    storyline: mockStoryline() as any,
  })).rejects.toMatchObject({ code: ErrorCodes.PROVIDER_REQUEST_FAILED });
});

it("configuration requires an API key", async () => {
  delete process.env.DEEPSEEK_API_KEY;
  await expect(new DeepSeekLLMClient().validateConfiguration())
    .rejects.toMatchObject({ code: ErrorCodes.PROVIDER_CONFIGURATION_INVALID });
});
```

Add a runtime test with a recording provider:

```ts
function makeTestProvider(overrides: Partial<LLMClient>): LLMClient {
  return {
    id: "test",
    name: "test",
    validateConfiguration: async () => {},
    generateStoryline: async input => generateStoryline(input),
    generateDeck: async input => generateDeck(input),
    generatePatch: async slide => slide,
    ...overrides,
  };
}

async function makeRuntime(provider: LLMClient) {
  const store = new LocalArtifactStore();
  const layout = new LayoutEngine();
  const review = new ReviewEngine();
  const patches = new PatchEngine();
  const editor = new IncrementalEditor(review, patches, provider);
  return {
    rt: new PresentationRuntime(
      store,
      layout,
      review,
      editor,
      new PptxExporter(layout),
      provider,
      new PdfExporter(layout)
    ),
  };
}

it("createDeck uses the injected provider for storyline and deck", async () => {
  const calls: string[] = [];
  const provider = makeTestProvider({
    generateStoryline: async input => {
      calls.push("storyline");
      return generateStoryline(input);
    },
    generateDeck: async input => {
      calls.push("deck");
      return generateDeck(input);
    },
  });
  const { rt } = await makeRuntime(provider);
  await rt.createDeck({ topic: "Provider route", slide_count: 6 });
  expect(calls).toEqual(["storyline", "deck"]);
});
```

- [ ] **Step 2: Run the tests and verify RED**

```bash
npx vitest run tests/deepseek-client.test.ts tests/workflow-e2e.test.ts
```

Expected: FAIL because DeepSeek still falls back and Runtime bypasses its provider.

- [ ] **Step 3: Remove all DeepSeek fallbacks**

Implement:

```ts
readonly id = "deepseek";
readonly name = "deepseek";

async validateConfiguration(): Promise<void> {
  try {
    getConfig();
  } catch (error) {
    throw new AppError(
      ErrorCodes.PROVIDER_CONFIGURATION_INVALID,
      "DeepSeek requires DEEPSEEK_API_KEY",
      { provider: this.id }
    );
  }
}
```

`callLLM` throws `PROVIDER_REQUEST_FAILED` for non-2xx responses, timeout, or network errors. `generateStoryline`, `generateDeck`, and `generatePatch` throw `PROVIDER_RESPONSE_INVALID` when JSON parsing or Zod validation fails. Do not catch these errors to call `RuleBasedLLMClient`.

- [ ] **Step 4: Inject the provider into Runtime**

Change the Runtime constructor to accept the same provider used by `IncrementalEditor`:

```ts
constructor(
  private store: ArtifactStore,
  private layoutEngine: LayoutEngine,
  private reviewEngine: ReviewEngine,
  private incrementalEditor: IncrementalEditor,
  private pptxExporter: PptxExporter,
  private llmProvider: LLMClient,
  private pdfExporter?: PdfExporter,
  private artifactService?: ArtifactService
) {}
```

Route generation through it:

```ts
async createStoryline(input: CreateStorylineInput): Promise<Storyline> {
  await this.llmProvider.validateConfiguration();
  return this.llmProvider.generateStoryline({
    topic: input.topic,
    audience: input.audience,
    purpose: input.purpose,
    research_brief: input.research_brief,
    slide_count: input.slide_count ?? 8,
  });
}

async createDeck(input: CreateDeckInput): Promise<Deck> {
  const parsed = CreateDeckInputSchema.parse(input);
  await this.llmProvider.validateConfiguration();
  const storyline = await this.llmProvider.generateStoryline({
    ...parsed,
    slide_count: parsed.slide_count,
  });
  const deck = await this.llmProvider.generateDeck({
    ...parsed,
    slide_count: parsed.slide_count,
    storyline,
  });
  await this.store.saveDeck(deck);
  return deck;
}
```

- [ ] **Step 5: Build the production registry in `src/index.ts`**

```ts
const registry = new ProviderRegistry()
  .register("deepseek", () => new DeepSeekLLMClient());

const llmClient = await registry.resolve(process.env.LLM_PROVIDER);
```

Do not register `rule-based` in the production entrypoint. Update every test, example, remote-server bootstrap, and eval constructor to pass an explicit provider.

- [ ] **Step 6: Verify GREEN**

```bash
npx vitest run tests/deepseek-client.test.ts tests/workflow-e2e.test.ts tests/pptx-exporter.test.ts
npm run typecheck
```

Expected: selected tests and typecheck PASS.

- [ ] **Step 7: Commit**

```bash
git add src/llm src/index.ts src/runtime tests examples eval codex-agent
git commit -m "feat: route production generation through configured provider"
```

## Task 3: Parse Complete Structured Research and Ground Generated Content

**Files:**

- Modify: `src/research/research-artifact.schema.ts`
- Modify: `src/research/research-ingestor.ts`
- Modify: `src/llm/llm-client.ts`
- Modify: `src/llm/deepseek-client.ts`
- Modify: `src/runtime/storyline-planner.ts`
- Modify: `src/schema/deck.schema.ts`
- Modify: `eval/run-eval.ts`
- Test: `tests/research-ingestor.test.ts`

- [ ] **Step 1: Add failing research-structure tests**

```ts
it("preserves every markdown section without truncating the report", () => {
  const text = [
    "# Agent OS",
    "## 执行摘要",
    "Agent 负载持续运行。",
    "## 架构",
    "Runtime 调用 Scheduler。",
    "## 路线图",
    "Q1 完成 PoC。",
    "## 参考来源",
    "[Kernel Docs](https://kernel.org/doc)",
  ].join("\n");
  const artifact = ingestResearchBrief(text, "Agent OS");
  expect(artifact.sections.map(s => s.title)).toEqual([
    "执行摘要", "架构", "路线图", "参考来源",
  ]);
  expect(artifact.raw_text).toBe(text);
  expect(artifact.sources).toContainEqual({
    title: "Kernel Docs",
    url: "https://kernel.org/doc",
    section: "参考来源",
  });
});

it("records numeric context and its source section", () => {
  const artifact = ingestResearchBrief(
    "# R\n## 性能\n端侧吞吐达到 61 TPS。",
    "R"
  );
  expect(artifact.data_points[0]).toMatchObject({
    value: "61 TPS",
    section: "性能",
  });
});
```

- [ ] **Step 2: Run and verify RED**

```bash
npx vitest run tests/research-ingestor.test.ts
```

Expected: FAIL because `sections`, `sources`, and complete `raw_text` are absent.

- [ ] **Step 3: Extend the research schema**

```ts
export const ResearchSectionSchema = z.object({
  id: z.string(),
  level: z.number().int().min(1).max(6),
  title: z.string(),
  body: z.string(),
});

export const ResearchSourceSchema = z.object({
  title: z.string(),
  url: z.string().url().optional(),
  section: z.string().optional(),
});

export const DataPointSchema = z.object({
  metric: z.string(),
  value: z.string(),
  context: z.string(),
  section: z.string().optional(),
  source: z.string().optional(),
});
```

Add `sections` and `sources` to `ResearchArtifactSchema`. Preserve `raw_text` without substring truncation.

- [ ] **Step 4: Implement a heading-aware parser**

Parse heading lines with `/^(#{1,6})\s+(.+)$/`, accumulate body until the next heading, and create stable IDs such as `section-001`. Extract Markdown links with `/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g`. Extract data points from each section so `section` and full sentence `context` are retained.

- [ ] **Step 5: Pass structured research to providers**

Add `research_artifact?: ResearchArtifact` to `StorylineInput` and `DeckGeneratorInput`. Parse once in Runtime, pass the artifact to both provider calls, and serialize the artifact in DeepSeek prompts instead of using `research_brief.substring(...)`.

Add explicit prompt requirements:

```text
- Use every slide's source_section_ids to assign unique content.
- Never invent a number absent from research.data_points.
- Put source references on slides containing numeric claims.
- Do not copy Markdown headings into key_points.
- Return distinct content for every slide.
```

Add optional `semantic_role`, `source_section_ids`, and `visual_intent` fields to `BaseSlideSchema`.

- [ ] **Step 6: Remove evaluation truncation**

Change:

```ts
research_brief = fs.readFileSync(briefPath, "utf-8");
```

- [ ] **Step 7: Verify GREEN**

```bash
npx vitest run tests/research-ingestor.test.ts tests/deepseek-client.test.ts
npm run typecheck
```

Expected: selected tests and typecheck PASS.

- [ ] **Step 8: Commit**

```bash
git add src/research src/llm src/runtime src/schema eval tests/research-ingestor.test.ts tests/deepseek-client.test.ts
git commit -m "feat: preserve structured research and slide provenance"
```

## Task 4: Add Content Quality and Repair Gates

**Files:**

- Create: `src/quality/content-quality-gate.ts`
- Create: `tests/content-quality-gate.test.ts`
- Create: `tests/helpers/deck-fixtures.ts`
- Create: `src/autofix/fixes/text-too-dense.fix.ts`
- Modify: `src/schema/review.schema.ts`
- Modify: `src/runtime/review-engine.ts`
- Modify: `src/autofix/auto-fix-engine.ts`
- Modify: `src/runtime/presentation-runtime.ts`

- [ ] **Step 1: Write failing content-quality tests**

Create the shared fixture:

```ts
import type { Deck, InsightSlide } from "../../src/schema/deck.schema.js";

export function insightSlide(
  keyPoints: string[],
  id = "slide-1"
): InsightSlide {
  return {
    slide_id: id,
    type: "insight",
    title: `Insight ${id}`,
    key_points: keyPoints,
  };
}

export function deckWithInsights(keyPointSets: string[][]): Deck {
  return {
    deck_id: "deck-quality",
    version: 1,
    title: "Quality Test",
    topic: "Quality Test",
    style_id: "allen_huawei_tech",
    slides: keyPointSets.map((points, index) =>
      insightSlide(points, `slide-${index + 1}`)
    ),
    created_at: "2026-06-30T00:00:00.000Z",
    updated_at: "2026-06-30T00:00:00.000Z",
  };
}
```

Then write:

```ts
import {
  deckWithInsights,
  insightSlide,
} from "./helpers/deck-fixtures.js";

it("reports duplicate insight bodies", () => {
  const result = new ContentQualityGate().validate(deckWithInsights([
    ["A unique claim", "Shared evidence"],
    ["A unique claim", "Shared evidence"],
  ]));
  expect(result.issues).toContainEqual(expect.objectContaining({
    type: "duplicate_slide_content",
    severity: "high",
  }));
});

it("reports an unsupported numeric claim", () => {
  const result = new ContentQualityGate().validate(
    deckWithInsights([["吞吐提升 88%"]]),
    {
      title: "Research",
      sections: [],
      key_findings: [],
      implications: [],
      data_points: [],
      sources: [],
      raw_text: "",
    }
  );
  expect(result.issues).toContainEqual(expect.objectContaining({
    type: "unsupported_numeric_claim",
    severity: "high",
  }));
});

it("condenses text to the configured budget", () => {
  const slide = insightSlide([
    "第一条很长的说明文字，包含大量不适合直接放入幻灯片的上下文。",
    "第二条很长的说明文字，也需要压缩。",
  ]);
  const fixed = condenseInsightSlide(slide, 40);
  expect(fixed.key_points.join("").length).toBeLessThanOrEqual(40);
  expect(fixed.key_points.every(point => point.length > 0)).toBe(true);
});
```

- [ ] **Step 2: Run and verify RED**

```bash
npx vitest run tests/content-quality-gate.test.ts
```

Expected: FAIL because the gate and density repair do not exist.

- [ ] **Step 3: Extend review issue types**

Add:

```ts
"duplicate_slide_content",
"unsupported_numeric_claim",
"missing_source_attribution",
"unresolved_placeholder",
"text_overflow_risk",
"contrast_too_low",
"unintended_overlap",
```

- [ ] **Step 4: Implement normalized duplicate and numeric grounding checks**

Normalize text by lowercasing, removing punctuation and whitespace, and excluding titles. Treat exact matches and token-set Jaccard similarity of at least `0.82` as duplicates. Extract numeric claims with the same units recognized by the research parser and require an exact normalized value match in `artifact.data_points`.

Return:

```ts
export interface ContentQualityResult {
  valid: boolean;
  issues: ReviewIssue[];
}
```

where `valid` is false when any high-severity issue exists.

- [ ] **Step 5: Implement deterministic density repair**

`condenseInsightSlide` removes Markdown markers, keeps one sentence per bullet, trims parenthetical detail, caps individual bullets proportionally, and never changes a number. `TextTooDenseFix` uses it to create an `update_slide_fields` patch.

Register `TextTooDenseFix` in `AutoFixEngine`.

- [ ] **Step 6: Enforce the gate in Runtime**

After provider deck generation:

```ts
let quality = this.contentQualityGate.validate(deck, researchArtifact);
if (!quality.valid) {
  deck = await this.llmProvider.repairDeck(deck, quality.issues, researchArtifact);
  quality = this.contentQualityGate.validate(deck, researchArtifact);
}
if (!quality.valid) {
  throw new AppError(
    ErrorCodes.CONTENT_QUALITY_FAILED,
    "Generated deck failed content quality validation",
    quality.issues
  );
}
```

Extend the provider contract with:

```ts
repairDeck(
  deck: Deck,
  issues: ReviewIssue[],
  research: ResearchArtifact
): Promise<Deck>;
```

Implement DeepSeek repair as one strict JSON request validated with `DeckSchema`. The rule-based test provider applies only deterministic density fixes and otherwise throws.

- [ ] **Step 7: Verify GREEN**

```bash
npx vitest run tests/content-quality-gate.test.ts tests/review-engine.test.ts tests/auto-fix-engine.test.ts
npm run typecheck
```

Expected: selected tests and typecheck PASS.

- [ ] **Step 8: Commit**

```bash
git add src/quality src/autofix src/runtime src/schema src/llm tests
git commit -m "feat: enforce grounded and non-duplicate deck content"
```

## Task 5: Fix Agent Runtime Context and Critical Failures

**Files:**

- Create: `codex-agent/tests/execution-context.test.ts`
- Modify: `codex-agent/types/execution-plan.ts`
- Modify: `codex-agent/planning/plan-mapper.ts`
- Modify: `codex-agent/core/context-store.ts`
- Modify: `codex-agent/core/execution-engine.ts`
- Modify: `codex-agent/core/trace-writer.ts`
- Modify: `codex-agent/workflows/presentation.workflow.ts`
- Modify: `codex-agent/core/execution-graph.ts`
- Modify: `src/mcp/tools.ts`

- [ ] **Step 1: Write failing execution-context tests**

```ts
it("injects deck_id into dependent tool calls", async () => {
  const calls: Array<{ tool: string; input: any }> = [];
  const client = {
    call: async (tool: string, input: any) => {
      calls.push({ tool, input });
      if (tool === "create_deck") {
        return {
          deck_id: "deck-real",
          slides: [{ slide_id: "slide-real", semantic_role: "architecture" }],
        };
      }
      return tool === "review_deck" ? { score: 90 } : { ok: true };
    },
  };
  const engine = new ExecutionEngine(new ContextStore(), new TraceWriter());
  const plan = {
    steps: [
      {
        id: "create",
        tool: "create_deck",
        input: { topic: "Agent OS" },
        critical: true,
        retry_policy: { max_retry: 0, fallback: "abort" as const },
      },
      {
        id: "review",
        tool: "review_deck",
        input: { deck_id: { $context: "deck_id" as const } },
        depends_on: ["create"],
        critical: true,
        retry_policy: { max_retry: 0, fallback: "abort" as const },
      },
    ],
  };
  await engine.run(plan, client);
  expect(calls.find(c => c.tool === "review_deck")?.input)
    .toEqual({ deck_id: "deck-real" });
});

it("resolves a semantic slide role to a real slide id", async () => {
  const calls: Array<{ tool: string; input: any }> = [];
  const client = {
    call: async (tool: string, input: any) => {
      calls.push({ tool, input });
      return tool === "create_deck"
        ? {
            deck_id: "deck-real",
            slides: [
              {
                slide_id: "slide-real",
                semantic_role: "architecture",
              },
            ],
          }
        : { ok: true };
    },
  };
  const plan = {
    steps: [
      {
        id: "create",
        tool: "create_deck",
        input: { topic: "Agent OS" },
        critical: true,
        retry_policy: { max_retry: 0, fallback: "abort" as const },
      },
      {
        id: "update",
        tool: "update_slide",
        input: {
          deck_id: { $context: "deck_id" as const },
          slide_id: { $slide_role: "architecture" },
          instruction: "Refine architecture",
        },
        depends_on: ["create"],
        critical: true,
        retry_policy: { max_retry: 0, fallback: "abort" as const },
      },
    ],
  };
  const engine = new ExecutionEngine(new ContextStore(), new TraceWriter());
  await engine.run(plan, client);
  expect(calls.find(c => c.tool === "update_slide")?.input).toEqual({
    deck_id: "deck-real",
    slide_id: "slide-real",
    instruction: "Refine architecture",
  });
});

it("stops after a critical tool failure", async () => {
  const client = { call: async () => { throw new Error("provider failed"); } };
  const engine = new ExecutionEngine(new ContextStore(), new TraceWriter());
  await expect(engine.run({
    steps: [{
      id: "create",
      tool: "create_deck",
      input: { topic: "Agent OS" },
      critical: true,
      retry_policy: { max_retry: 0, fallback: "abort" },
    }],
  }, client)).rejects.toThrow("provider failed");
});
```

- [ ] **Step 2: Run and verify RED**

```bash
npx vitest run codex-agent/tests/execution-context.test.ts codex-agent/tests/v7-e2e.test.ts
```

Expected: FAIL because context references are not resolved and failures are swallowed.

- [ ] **Step 3: Add context-reference inputs**

```ts
export type ContextReference =
  | { $context: "deck_id" }
  | { $slide_role: string };

export type ExecutionStep = {
  id: string;
  tool: string;
  input: Record<string, unknown | ContextReference>;
  depends_on?: string[];
  retry_policy?: { max_retry: number; fallback: "abort" | "skip" };
  critical?: boolean;
};
```

`ContextStore` gains:

```ts
setSlideMap(slides: Array<{ slide_id: string; semantic_role?: string }>): void
resolveInput(input: Record<string, unknown>): Record<string, unknown>
```

It recursively replaces `$context` and `$slide_role` references. Missing values throw `EXECUTION_CONTEXT_UNRESOLVED`.

Update the `create_deck` response in `src/mcp/tools.ts` so every returned slide includes `semantic_role` alongside `slide_id`, `type`, and `title`.

- [ ] **Step 4: Put references into the plan**

`create_deck` includes the complete `research_brief`, audience, purpose, and style. Downstream steps use:

```ts
input: { deck_id: { $context: "deck_id" } }
```

Updates use:

```ts
input: {
  deck_id: { $context: "deck_id" },
  slide_id: { $slide_role: slide.semantic_role },
  instruction: slide.intent,
}
```

All provider, create, review, repair, and export steps are `critical: true` with `fallback: "abort"`.

- [ ] **Step 5: Resolve input immediately before each tool call**

```ts
const resolvedInput = this.context.resolveInput(step.input);
output = await client.call(step.tool, resolvedInput);
if (step.tool === "create_deck") {
  this.context.set("deck_id", output.deck_id);
  this.context.setSlideMap(output.slides ?? []);
}
```

Trace the sanitized resolved input. On a critical failure, add the failed node and rethrow. Retry counters are tracked per step, not globally.

- [ ] **Step 6: Restore missing graph behavior**

Implement `forkExecution` used by the existing V0.8 and golden tests:

```ts
forkExecution(
  sourceId: string,
  branches: ExecutionStep[][]
): void {
  this.removeNode(sourceId);
  for (const branch of branches) {
    for (const node of branch) this.addNode(node);
  }
}
```

- [ ] **Step 7: Verify GREEN**

```bash
npx vitest run codex-agent/tests/execution-context.test.ts codex-agent/tests/v7-e2e.test.ts codex-agent/tests/v8-multi-agent-e2e.test.ts codex-agent/eval/golden-multi-agent.test.ts
npm run typecheck
```

Expected: selected tests and typecheck PASS.

- [ ] **Step 8: Commit**

```bash
git add codex-agent
git commit -m "fix: propagate runtime context through agent execution"
```

## Task 6: Adaptive Text Layout, Correct Transparency, and V0.9 Design Adapter

**Files:**

- Create: `src/layout/v09-layout-adapter.ts`
- Modify: `src/schema/layout.schema.ts`
- Modify: `src/layout/layout-utils.ts`
- Modify: `src/layout/layouts/insight.layout.ts`
- Modify: `src/layout/layouts/architecture.layout.ts`
- Modify: `src/layout/layout-engine.ts`
- Modify: `src/export/pptx-exporter.ts`
- Modify: `src/export/pptx-theme.ts`
- Modify: `src/styles/allen-huawei-tech.ts`
- Modify: `codex-agent/design/design-engine.ts`
- Test: `tests/layout-engine.test.ts`
- Test: `tests/pptx-exporter.test.ts`

- [ ] **Step 1: Add failing adaptive-layout tests**

```ts
const longInsight = {
  slide_id: "insight-long",
  type: "insight",
  title: "Long Insight",
  key_points: [
    "端侧 Agent 负载包含持续感知、模型推理、工具调用和跨设备协同，需要统一资源治理。",
    "传统固定高度文本框无法容纳换行后的内容，因此下一条正文会覆盖上一条。",
  ],
} as const;

it("allocates non-overlapping heights for wrapped insight bullets", () => {
  const elements = engine.layoutSlide(longInsight, style);
  const bullets = elements.filter(
    (e): e is TextElement => e.kind === "text" && e.text.startsWith("•")
  );
  for (let i = 1; i < bullets.length; i++) {
    expect(bullets[i].y).toBeGreaterThanOrEqual(
      bullets[i - 1].y + bullets[i - 1].h
    );
  }
});

it("uses explicit fill transparency for architecture layers", () => {
  const elements = engine.layoutSlide({
    slide_id: "architecture",
    type: "architecture",
    title: "Architecture",
    layers: [{
      name: "Runtime",
      components: ["Scheduler", "Memory Manager"],
    }],
  }, style);
  const layer = elements.find(
    e => e.kind === "shape" && e.fill_transparency !== undefined
  ) as ShapeElement;
  expect(layer.fill).toBe(style.colors.primary);
  expect(layer.fill_transparency).toBeGreaterThanOrEqual(80);
});

it("applies at least 35pt slide titles", () => {
  const elements = engine.layoutSlide(longInsight, style);
  const title = elements.find(
    e => e.kind === "text" && e.role === "title"
  ) as TextElement;
  expect(title.font_size).toBeGreaterThanOrEqual(35);
});
```

- [ ] **Step 2: Run and verify RED**

```bash
npx vitest run tests/layout-engine.test.ts tests/pptx-exporter.test.ts
```

Expected: FAIL for overlapping bullet coordinates, missing transparency, and 28 pt titles.

- [ ] **Step 3: Add text measurement helpers**

Add:

```ts
export function estimateWrappedLines(
  text: string,
  widthInches: number,
  fontSize: number
): number {
  const charsPerLine = Math.max(8, Math.floor(widthInches * 72 / (fontSize * 0.9)));
  return text.split("\n").reduce(
    (sum, line) => sum + Math.max(1, Math.ceil(line.length / charsPerLine)),
    0
  );
}

export function estimateTextHeight(
  text: string,
  widthInches: number,
  fontSize: number,
  lineHeight = 1.2
): number {
  return estimateWrappedLines(text, widthInches, fontSize)
    * fontSize * lineHeight / 72;
}
```

The Insight layout uses these heights plus a `0.12` inch gap. It throws a layout-quality error if the available content height is exceeded after content repair.

- [ ] **Step 4: Add explicit transparency and text fitting**

Extend `ShapeElementSchema`:

```ts
fill_transparency: z.number().min(0).max(100).optional(),
```

Render:

```ts
fill: {
  color: pptxColor(el.fill || style.colors.background),
  transparency: el.fill_transparency ?? 0,
},
```

Architecture layers use `fill: color` and `fill_transparency: 88`. Remove eight-digit color concatenation.

Text export uses:

```ts
fit: "shrink",
```

while layout validation still enforces minimum sizes.

- [ ] **Step 5: Repair and integrate DesignEngine**

Replace global coordinate offsets with a focused method:

```ts
applyToLayout(
  elements: LayoutElement[],
  style: StyleProfile
): LayoutElement[] {
  return elements.map(element => {
    if (element.kind !== "text") return element;
    if (element.role === "title") {
      return {
        ...element,
        font_size: Math.max(element.font_size ?? 0, style.typography.title_size),
        bold: true,
      };
    }
    return {
      ...element,
      font_size: Math.max(
        element.font_size ?? style.typography.body_size,
        element.role === "body" ? style.typography.body_size : element.font_size ?? 12
      ),
    };
  });
}
```

`V09LayoutAdapter` calls this DesignEngine method and `VisualBalance.evaluate` for each non-background element set. `LayoutEngine` runs the adapter before appending page numbers.

Set technical style title size to `35`, deck title to `50`, body to `16`, and caption to `12`.

- [ ] **Step 6: Verify GREEN**

```bash
npx vitest run tests/layout-engine.test.ts tests/pptx-exporter.test.ts codex-agent/tests/v9-3-design-e2e.test.ts
npm run typecheck
```

Expected: selected tests and typecheck PASS.

- [ ] **Step 7: Commit**

```bash
git add src/layout src/schema/layout.schema.ts src/export src/styles codex-agent/design tests
git commit -m "feat: add adaptive layout and production design adapter"
```

## Task 7: Integrate Relationship-Aware Visual Planning

**Files:**

- Modify: `src/schema/deck.schema.ts`
- Modify: `src/llm/deepseek-client.ts`
- Modify: `codex-agent/visual/visual-planner.ts`
- Modify: `codex-agent/visual/diagram-generator.ts`
- Modify: `src/layout/v09-layout-adapter.ts`
- Modify: `src/layout/layouts/architecture.layout.ts`
- Test: `codex-agent/tests/v9-2-visual-e2e.test.ts`
- Test: `tests/layout-engine.test.ts`

- [ ] **Step 1: Add failing Chinese-relationship and fallback tests**

```ts
it("extracts explicit Chinese architecture relationships", () => {
  const spec = new VisualPlanner().planFromArchitecture(
    "Agent Runtime 调用 Scheduler；Scheduler 控制 IO Engine。"
  );
  expect(spec.edges).toEqual(expect.arrayContaining([
    expect.objectContaining({ relation: "calls" }),
    expect.objectContaining({ relation: "controls" }),
  ]));
});

it("does not invent edges for an unconnected component list", () => {
  const spec = new VisualPlanner().planFromArchitecture(
    "组件包括 Agent Runtime、Scheduler、Memory Manager"
  );
  expect(spec.edges).toHaveLength(0);
});
```

- [ ] **Step 2: Run and verify RED**

```bash
npx vitest run codex-agent/tests/v9-2-visual-e2e.test.ts
```

Expected: FAIL because only English relationship verbs are parsed.

- [ ] **Step 3: Add typed relationships to architecture slides**

```ts
relationships: z.array(z.object({
  from: z.string(),
  to: z.string(),
  relation: z.enum(["calls", "flows_to", "depends_on", "controls"]),
})).optional(),
```

Update the DeepSeek Deck prompt to output relationships only when explicitly supported by research sections.

- [ ] **Step 4: Parse Chinese and English relation phrases**

Support:

```ts
const relationPatterns = [
  { regex: /(.+?)\s+(?:calls|invokes|调用)\s+(.+)/, relation: "calls" },
  { regex: /(.+?)\s+(?:controls|manages|控制|管理)\s+(.+)/, relation: "controls" },
  { regex: /(.+?)\s+(?:depends on|依赖)\s+(.+)/, relation: "depends_on" },
  { regex: /(.+?)\s+(?:flows to|sends to|流向|发送到)\s+(.+)/, relation: "flows_to" },
] as const;
```

Trim punctuation from labels. Do not add edges for unmatched component lists.

- [ ] **Step 5: Render a diagram only when relationships exist**

`V09LayoutAdapter` converts an architecture slide with relationships into `VisualSpec`, runs `DiagramGenerator`, and emits connector elements before node elements. Slides without relationships continue through the corrected layered layout.

- [ ] **Step 6: Verify GREEN**

```bash
npx vitest run codex-agent/tests/v9-2-visual-e2e.test.ts tests/layout-engine.test.ts
npm run typecheck
```

Expected: selected tests and typecheck PASS.

- [ ] **Step 7: Commit**

```bash
git add src/schema/deck.schema.ts src/llm/deepseek-client.ts src/layout codex-agent/visual codex-agent/tests tests/layout-engine.test.ts
git commit -m "feat: render source-grounded architecture relationships"
```

## Task 8: Static Quality Gate, Render Regression, and Full Verification

**Files:**

- Create: `src/quality/layout-quality-gate.ts`
- Create: `tests/layout-quality-gate.test.ts`
- Modify: `src/export/pptx-exporter.ts`
- Modify: `src/runtime/presentation-runtime.ts`
- Modify: `eval/run-eval.ts`
- Modify: `docs/evaluation.md`
- Modify: existing tests with obsolete expectations.

- [ ] **Step 1: Write failing layout-quality tests**

```ts
const style = getStyleById("allen_huawei_tech");
const text = (input: Partial<TextElement> & Pick<TextElement, "x" | "y" | "w" | "h" | "text">): TextElement => ({
  id: input.id ?? "text",
  kind: "text",
  role: input.role ?? "body",
  font_size: input.font_size ?? 16,
  color: input.color ?? style.colors.text,
  ...input,
});
const shape = (input: Partial<ShapeElement> & Pick<ShapeElement, "x" | "y" | "w" | "h">): ShapeElement => ({
  id: input.id ?? "shape",
  kind: "shape",
  shape: input.shape ?? "rect",
  fill: input.fill ?? style.colors.background,
  ...input,
});

it("rejects text outside the slide", () => {
  const result = gate.validate([
    text({ x: 12.8, y: 1, w: 1, h: 1, text: "outside" }),
  ], style);
  expect(result.issues).toContainEqual(expect.objectContaining({
    type: "element_out_of_bounds",
    severity: "high",
  }));
});

it("rejects intersecting body text boxes", () => {
  const result = gate.validate([
    text({ id: "a", x: 1, y: 1, w: 4, h: 1, text: "A" }),
    text({ id: "b", x: 1, y: 1.5, w: 4, h: 1, text: "B" }),
  ], style);
  expect(result.issues).toContainEqual(expect.objectContaining({
    type: "unintended_overlap",
    severity: "high",
  }));
});

it("rejects low text/background contrast", () => {
  const result = gate.validate([
    shape({ id: "bg", x: 1, y: 1, w: 4, h: 2, fill: "A80000" }),
    text({ id: "label", x: 1.2, y: 1.2, w: 3, h: 1, color: "A80000" }),
  ], style);
  expect(result.issues).toContainEqual(expect.objectContaining({
    type: "contrast_too_low",
    severity: "high",
  }));
});
```

- [ ] **Step 2: Run and verify RED**

```bash
npx vitest run tests/layout-quality-gate.test.ts
```

Expected: FAIL because the layout quality gate does not exist.

- [ ] **Step 3: Implement static validation**

The gate:

- ignores full-slide background intersections;
- checks every element rectangle against canvas bounds;
- treats intersecting text/body rectangles as unintended unless an explicit `allow_overlap_with` relationship exists;
- estimates text capacity using `estimateTextHeight`;
- calculates WCAG relative luminance and requires at least `4.5:1` for body text and `3:1` for large text;
- enforces style minimum font sizes;
- returns `valid: false` for high-severity issues.

- [ ] **Step 4: Block export on static failures**

`PptxExporter.export` runs the gate on every layouted slide before writing:

```ts
const report = this.layoutQualityGate.validateDeck(layoutedDeck, style);
if (!report.valid) {
  throw new AppError(
    ErrorCodes.LAYOUT_QUALITY_FAILED,
    "Deck contains blocking layout issues",
    report.issues
  );
}
```

- [ ] **Step 5: Update evaluation metrics**

Add:

- `max_duplicate_content`;
- `max_high_severity_review_issues`;
- `requires_source_for_numeric_claims`;
- `requires_static_layout_pass`;
- `requires_render_pass`.

Remove `min_review_score_before_autofix: 0`. Update documentation to state that structural presence alone cannot pass a case.

- [ ] **Step 6: Fix the existing failing tests for valid behavior**

Run the complete suite, then address:

- layout-plan tests so title and agenda are not incorrectly required to contain a diagram or metric;
- deduplication so replacement markers are excluded consistently;
- visual parser relationship tests through Task 7 behavior;
- execution-graph tests through Task 5 behavior;
- floating-point comparison with `toBeCloseTo(0.88)`.

Do not weaken assertions that represent approved quality requirements.

- [ ] **Step 7: Run full automated verification**

```bash
npm test
npm run typecheck
git diff --check
```

Expected: 0 failing test files, 0 failing tests, typecheck exit 0, and no whitespace errors.

- [ ] **Step 8: Run the end-to-end AgentOS regression**

With a valid production configuration:

```bash
test -n "$DEEPSEEK_API_KEY"
run_log=/tmp/presentation-agent-e2e.log
LLM_PROVIDER=deepseek \
  DEEPSEEK_API_KEY="$DEEPSEEK_API_KEY" \
  npx tsx examples/run-e2e.ts 2>&1 | tee "$run_log"
export_path=$(sed -n 's/^EXPORT_PATH=//p' "$run_log" | tail -1)
test -n "$export_path"
test -f "$export_path"
```

Expected: the command returns a new Deck ID and PPTX path without provider, content, or layout gate failures.

Update `examples/run-e2e.ts` to load the complete AgentOS report from
`../Agentic AI时代端侧负载变化与操作系统内核演进报告.md`, resolve the configured
provider through `ProviderRegistry`, pass the provider to Runtime, and print:

```ts
console.error(`EXPORT_PATH=${e2.file_path}`);
```

- [ ] **Step 9: Render and inspect every output slide**

```bash
PRESENTATIONS_SKILL_DIR=/Users/allen/.codex/plugins/cache/openai-primary-runtime/presentations/26.623.12021/skills/presentations
python3 "$PRESENTATIONS_SKILL_DIR/container_tools/render_slides.py" \
  "$export_path" \
  --output_dir /tmp/presentation-agent-final-render

python3 "$PRESENTATIONS_SKILL_DIR/container_tools/create_montage.py" \
  --input_dir /tmp/presentation-agent-final-render \
  --output_file /tmp/presentation-agent-final-montage.png \
  --label_mode filename

python3 "$PRESENTATIONS_SKILL_DIR/container_tools/slides_test.py" \
  "$export_path"
```

Inspect every full-size rendered PNG, not only the montage. Acceptance requires no clipped or overlapping text, no low-contrast text, no unresolved placeholders, distinct insight content, readable diagrams, and traceable numeric claims.

- [ ] **Step 10: Commit**

```bash
git add src/quality src/export src/runtime eval docs tests codex-agent
git commit -m "feat: block low-quality presentation exports"
```

## Final Acceptance Checklist

- [ ] Production startup rejects missing `LLM_PROVIDER`.
- [ ] DeepSeek rejects missing API configuration.
- [ ] No provider silently falls back.
- [ ] Runtime uses the configured provider for storyline, deck, and edits.
- [ ] Complete research input is parsed and preserved.
- [ ] Duplicate slides and unsupported numbers block generation.
- [ ] `deck_id` and real `slide_id` values reach all Agent steps.
- [ ] Insight text boxes do not overlap.
- [ ] Architecture transparency and contrast are correct.
- [ ] V0.9 design and visual modules execute on the production path.
- [ ] Static quality validation blocks bad exports.
- [ ] All automated tests and type checking pass.
- [ ] The final AgentOS deck is generated, rendered, and inspected slide by slide.
