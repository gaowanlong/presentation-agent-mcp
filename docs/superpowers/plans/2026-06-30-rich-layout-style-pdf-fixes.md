# Rich Layout, Custom Style, and PDF Export Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make DeepSeek generate information-rich semantic slide compositions, apply the approved `allen_huawei_tech` style consistently, and create non-empty Chinese PDFs from the final PPTX.

**Architecture:** Extend the compatible Deck schema with rich text, cards, diagrams, and two semantic layout variants. Make `PresentationRuntime` use the configured provider without fallback, render all visual output through the PPTX pipeline, and convert that PPTX to PDF with an isolated LibreOffice converter.

**Tech Stack:** TypeScript, Zod, Vitest, PptxGenJS, pdf-lib for PDF inspection, LibreOffice headless for PPTX-to-PDF conversion.

---

## File Map

New production files:

- `src/layout/diagram-layout.ts` — deterministic native-shape diagram placement and edge ordering.
- `src/layout/layouts/architecture-with-notes.layout.ts` — 62/38 architecture composition.
- `src/layout/layouts/key-technology-quadrants.layout.ts` — required two-by-two key-technology composition.
- `src/export/libreoffice-pdf-converter.ts` — isolated PPTX-to-PDF conversion and validation.
- `src/quality/assertion-title.ts` — assertion-title validation shared by provider and export gates.

New test files:

- `tests/rich-layout-schema.test.ts`
- `tests/custom-style.test.ts`
- `tests/runtime-provider-routing.test.ts`
- `tests/rich-text-exporter.test.ts`
- `tests/architecture-with-notes-layout.test.ts`
- `tests/key-technology-quadrants-layout.test.ts`
- `tests/libreoffice-pdf-converter.test.ts`
- `tests/pdf-export-integration.test.ts`

Modified production files:

- `src/schema/deck.schema.ts`
- `src/schema/layout.schema.ts`
- `src/schema/style.schema.ts`
- `src/styles/allen-huawei-tech.ts`
- `src/styles/default-style.ts`
- `src/layout/layout-utils.ts`
- `src/layout/layout-engine.ts`
- `src/layout/layouts/title.layout.ts`
- `src/export/pptx-exporter.ts`
- `src/export/pdf-exporter.ts`
- `src/runtime/presentation-runtime.ts`
- `src/runtime/incremental-editor.ts`
- `src/llm/llm-client.ts`
- `src/llm/deepseek-client.ts`
- `src/index.ts`
- `src/mcp/tools.ts`
- `src/utils/errors.ts`
- `src/quality/layout-quality-gate.ts`
- `tests/deepseek-client.test.ts`
- `tests/layout-engine.test.ts`
- `tests/layout-quality-gate.test.ts`
- `tests/workflow-e2e.test.ts`
- `tests/acceptance-v0.4.test.ts`
- `examples/run-e2e.ts`
- `eval/run-eval.ts`
- `docs/evaluation.md`
- `README.md`
- `codex-agent/cli/run.ts`

## Task 1: Add Compatible Rich-Content Schemas and Approved Style Tokens

**Files:**

- Create: `tests/rich-layout-schema.test.ts`
- Create: `tests/custom-style.test.ts`
- Modify: `src/schema/deck.schema.ts`
- Modify: `src/schema/layout.schema.ts`
- Modify: `src/schema/style.schema.ts`
- Modify: `src/styles/allen-huawei-tech.ts`
- Modify: `src/styles/default-style.ts`

- [ ] **Step 1: Write the failing rich-content schema tests**

Create `tests/rich-layout-schema.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  ArchitectureSlideSchema,
  InsightSlideSchema,
  RichTextSchema,
} from "../src/schema/deck.schema.js";

const card = {
  id: "card-1",
  title: "Agent-aware 调度",
  body: [
    { text: "基于执行阶段分配资源，目标利用率达到 " },
    { text: "85%", emphasis: true },
  ],
};

const diagram = {
  direction: "layered" as const,
  nodes: [
    { id: "runtime", label: "Agent Runtime", group: "运行时层" },
    { id: "scheduler", label: "Scheduler", group: "内核层" },
  ],
  edges: [{ from: "runtime", to: "scheduler", relation: "calls" }],
};

describe("rich layout schemas", () => {
  it("accepts non-empty rich text runs", () => {
    expect(RichTextSchema.parse(card.body)).toEqual(card.body);
  });

  it("rejects an empty rich text run", () => {
    expect(() => RichTextSchema.parse([{ text: "" }])).toThrow();
  });

  it("accepts architecture_with_notes content", () => {
    const slide = ArchitectureSlideSchema.parse({
      slide_id: "architecture",
      type: "architecture",
      title: "统一控制面让 Agent 负载获得端到端资源保障",
      layout_variant: "architecture_with_notes",
      layers: [],
      architecture_content: {
        diagram,
        key_technologies: [card, { ...card, id: "card-2" }, { ...card, id: "card-3" }],
      },
    });
    expect(slide.architecture_content?.key_technologies).toHaveLength(3);
  });

  it("accepts all key-technology quadrants", () => {
    const slide = InsightSlideSchema.parse({
      slide_id: "technology",
      type: "insight",
      title: "Agent-aware 调度把模型阶段映射为可治理的执行单元",
      layout_variant: "key_technology_quadrants",
      key_points: [],
      key_technology_content: {
        challenge: card,
        architecture: diagram,
        details: { ...card, id: "details" },
        benefits: { ...card, id: "benefits" },
      },
    });
    expect(slide.key_technology_content?.architecture.nodes).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Write the failing style-token tests**

Create `tests/custom-style.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { getStyleById } from "../src/styles/index.js";

describe("allen_huawei_tech style", () => {
  const style = getStyleById("allen_huawei_tech");

  it("uses the approved typography", () => {
    expect(style.typography.font_face).toBe("Microsoft YaHei");
    expect(style.typography.cover_title_size).toBe(36);
    expect(style.typography.title_size).toBe(24);
    expect(style.typography.body_size).toBe(14);
    expect(style.typography.min_body_size).toBe(12);
  });

  it("uses the approved colors", () => {
    expect(style.colors.background).toBe("FFFFFF");
    expect(style.colors.primary).toBe("A80000");
    expect(style.colors.emphasis).toBe("0000FF");
    expect(style.colors.card_border).toBe("D9D9D9");
    expect(style.colors.card_title_background).toBe("CCECFF");
    expect(style.colors.card_title_text).toBe("1F2937");
  });
});
```

- [ ] **Step 3: Run both tests and verify RED**

Run:

```bash
npx vitest run tests/rich-layout-schema.test.ts tests/custom-style.test.ts
```

Expected: FAIL because the rich-content schemas and new style tokens do not exist.

- [ ] **Step 4: Add Deck rich-content schemas**

Add before the slide schemas in `src/schema/deck.schema.ts`:

```ts
export const RichTextRunSchema = z.object({
  text: z.string().min(1),
  emphasis: z.boolean().optional(),
  bold: z.boolean().optional(),
});
export const RichTextSchema = z.array(RichTextRunSchema).min(1);
export type RichTextRun = z.infer<typeof RichTextRunSchema>;
export type RichText = z.infer<typeof RichTextSchema>;

export const ContentCardSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  body: RichTextSchema,
});
export type ContentCard = z.infer<typeof ContentCardSchema>;

export const DiagramNodeSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  group: z.string().optional(),
  description: z.string().optional(),
});

export const DiagramEdgeSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  relation: z.string().optional(),
});

export const SlideDiagramSchema = z.object({
  nodes: z.array(DiagramNodeSchema).min(1),
  edges: z.array(DiagramEdgeSchema),
  direction: z.enum(["left-right", "top-down", "layered"]).optional(),
});
export type SlideDiagram = z.infer<typeof SlideDiagramSchema>;

export const LayoutVariantEnum = z.enum([
  "architecture_with_notes",
  "key_technology_quadrants",
]);
```

Extend `BaseSlideSchema` with:

```ts
layout_variant: LayoutVariantEnum.optional(),
```

Extend `ArchitectureSlideSchema` with:

```ts
architecture_content: z.object({
  diagram: SlideDiagramSchema,
  key_technologies: z.array(ContentCardSchema).min(3).max(4),
}).optional(),
```

Extend `InsightSlideSchema` with:

```ts
key_technology_content: z.object({
  challenge: ContentCardSchema,
  architecture: SlideDiagramSchema,
  details: ContentCardSchema,
  benefits: ContentCardSchema,
}).optional(),
```

Add `superRefine` checks so `architecture_with_notes` requires `architecture_content` and `key_technology_quadrants` requires `key_technology_content`.

- [ ] **Step 5: Add layout rich-text fields**

In `src/schema/layout.schema.ts`, change `TextElementSchema` to accept exactly one display source:

```ts
export const LayoutTextRunSchema = z.object({
  text: z.string().min(1),
  emphasis: z.boolean().optional(),
  bold: z.boolean().optional(),
});

export const TextElementSchema = z.object({
  id: z.string(),
  kind: z.literal("text"),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  text: z.string().optional(),
  runs: z.array(LayoutTextRunSchema).min(1).optional(),
  role: z.enum(["title", "subtitle", "body", "caption", "label"]),
  font_size: z.number().optional(),
  min_font_size: z.number().optional(),
  font_face: z.string().optional(),
  bold: z.boolean().optional(),
  color: z.string().optional(),
  semantic_role: z.string().optional(),
});
```

The `textElement` helper enforces exactly one of `text` and `runs`; the raw schema remains compatible with legacy stored layout JSON.

Extend `ShapeElementSchema`:

```ts
semantic_role: z.string().optional(),
```

Extend `CardElementSchema` without removing its legacy optional fields:

```ts
body_runs: z.array(LayoutTextRunSchema).min(1).optional(),
title_fill: z.string().optional(),
title_color: z.string().optional(),
body_fill: z.string().optional(),
border_color: z.string().optional(),
semantic_role: z.string().optional(),
```

Extend `LineElementSchema`:

```ts
end_arrow: z.enum(["none", "triangle"]).optional(),
semantic_role: z.string().optional(),
```

- [ ] **Step 6: Extend StyleProfile and overwrite `allen_huawei_tech`**

Add to typography:

```ts
cover_title_size: z.number().positive(),
min_body_size: z.number().positive(),
```

Add to colors:

```ts
emphasis: z.string(),
card_border: z.string(),
card_title_background: z.string(),
card_title_text: z.string(),
```

Set `allenHuaweiTechStyle`:

```ts
typography: {
  font_face: "Microsoft YaHei",
  cover_title_size: 36,
  title_size: 24,
  subtitle_size: 18,
  body_size: 14,
  min_body_size: 12,
  caption_size: 12,
},
colors: {
  background: "FFFFFF",
  primary: "A80000",
  secondary: "1F4E79",
  accent: "0070C0",
  emphasis: "0000FF",
  text: "1F2937",
  muted_text: "6B7280",
  border: "D9D9D9",
  card_border: "D9D9D9",
  card_background: "FFFFFF",
  card_title_background: "CCECFF",
  card_title_text: "1F2937",
},
```

Give `defaultStyle` valid conservative values for the new required fields.

- [ ] **Step 7: Run tests and verify GREEN**

```bash
npx vitest run tests/rich-layout-schema.test.ts tests/custom-style.test.ts tests/deck-schema.test.ts
npm run typecheck
```

Expected: selected tests PASS and typecheck exits 0.

- [ ] **Step 8: Commit**

```bash
git add src/schema src/styles tests/rich-layout-schema.test.ts tests/custom-style.test.ts
git commit -m "feat: add rich slide schemas and approved custom style"
```

## Task 2: Route Production Generation Strictly Through the Configured Provider

**Files:**

- Create: `tests/runtime-provider-routing.test.ts`
- Modify: `src/llm/llm-client.ts`
- Modify: `src/llm/deepseek-client.ts`
- Modify: `src/runtime/presentation-runtime.ts`
- Modify: `src/runtime/incremental-editor.ts`
- Modify: `src/index.ts`
- Modify: `src/utils/errors.ts`
- Modify: `tests/deepseek-client.test.ts`
- Modify: `tests/workflow-e2e.test.ts`
- Modify: `tests/acceptance-v0.4.test.ts`
- Modify: `eval/run-eval.ts`
- Modify: `examples/run-e2e.ts`
- Modify: `codex-agent/cli/run.ts`

- [ ] **Step 1: Write a failing Runtime routing test**

Create `tests/runtime-provider-routing.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { LLMClient } from "../src/llm/llm-client.js";
import { PresentationRuntime } from "../src/runtime/presentation-runtime.js";
import { LayoutEngine } from "../src/layout/layout-engine.js";
import { ReviewEngine } from "../src/runtime/review-engine.js";
import { IncrementalEditor } from "../src/runtime/incremental-editor.js";
import { PatchEngine } from "../src/patch/patch-engine.js";
import { PptxExporter } from "../src/export/pptx-exporter.js";
import { LocalArtifactStore } from "../src/storage/local-artifact-store.js";
import { generateStoryline } from "../src/runtime/storyline-planner.js";
import { generateDeck } from "../src/runtime/deck-generator.js";

describe("PresentationRuntime provider routing", () => {
  it("uses the configured provider for storyline and Deck generation", async () => {
    const calls: string[] = [];
    const provider: LLMClient = {
      id: "recording",
      name: "recording",
      validateConfiguration: async () => { calls.push("validate"); },
      generateStoryline: async input => {
        calls.push("storyline");
        return generateStoryline(input);
      },
      generateDeck: async input => {
        calls.push("deck");
        return generateDeck(input);
      },
      generatePatch: async slide => slide,
    };
    const store = new LocalArtifactStore();
    const layout = new LayoutEngine();
    const review = new ReviewEngine();
    const patches = new PatchEngine();
    const editor = new IncrementalEditor(review, patches, provider);
    const runtime = new PresentationRuntime(
      store,
      layout,
      review,
      editor,
      new PptxExporter(layout),
      provider
    );

    await runtime.createDeck({
      topic: "Provider-routed deck",
      slide_count: 6,
      style_id: "allen_huawei_tech",
    });

    expect(calls).toEqual(["validate", "storyline", "deck"]);
  });
});
```

- [ ] **Step 2: Replace DeepSeek fallback tests with strict-failure tests**

In `tests/deepseek-client.test.ts`, replace every fallback assertion with:

```ts
it("storyline: invalid JSON fails instead of falling back", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(mockResp("not json"));
  await expect(client.generateStoryline({
    topic: "AI",
    slide_count: 6,
  })).rejects.toMatchObject({
    code: ErrorCodes.PROVIDER_RESPONSE_INVALID,
  });
});

it("deck: API failure fails instead of falling back", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(mockErr());
  await expect(client.generateDeck({
    topic: "AI",
    slide_count: 6,
    style_id: "allen_huawei_tech",
    storyline: mockStoryline() as any,
  })).rejects.toMatchObject({
    code: ErrorCodes.PROVIDER_REQUEST_FAILED,
  });
});
```

Keep valid-response tests unchanged.

- [ ] **Step 3: Run routing and DeepSeek tests and verify RED**

```bash
npx vitest run tests/runtime-provider-routing.test.ts tests/deepseek-client.test.ts
```

Expected: Runtime routing test shows no provider calls; strict DeepSeek tests receive fallback content instead of errors.

- [ ] **Step 4: Make DeepSeek strict**

Remove the `RuleBasedLLMClient` import, fallback field, fallback constructor, and catch-to-fallback branches.

Add:

```ts
async validateConfiguration(): Promise<void> {
  try {
    getConfig();
  } catch {
    throw new AppError(
      ErrorCodes.PROVIDER_CONFIGURATION_INVALID,
      "DeepSeek requires DEEPSEEK_API_KEY"
    );
  }
}
```

`callLLM` throws:

```ts
throw new AppError(
  ErrorCodes.PROVIDER_REQUEST_FAILED,
  `DeepSeek request failed with HTTP ${response.status}`,
  { provider: this.id, status: response.status }
);
```

Network and timeout errors use the same code with sanitized details. Invalid JSON, invalid storyline, invalid Slide, and invalid Deck use `PROVIDER_RESPONSE_INVALID` and include Zod issues without including the API key.

- [ ] **Step 5: Inject the provider into Runtime**

Change the constructor:

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

Change generation:

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
    topic: parsed.topic,
    audience: parsed.audience,
    purpose: parsed.purpose,
    research_brief: parsed.research_brief,
    slide_count: parsed.slide_count,
  });
  const deck = await this.llmProvider.generateDeck({
    topic: parsed.topic,
    audience: parsed.audience,
    purpose: parsed.purpose,
    research_brief: parsed.research_brief,
    slide_count: parsed.slide_count,
    style_id: parsed.style_id,
    storyline,
  });
  await this.store.saveDeck(deck);
  return deck;
}
```

Export `CreateDeckInput` instead of using an anonymous type.

- [ ] **Step 6: Resolve the provider from the registry at startup**

In `src/index.ts`:

```ts
const registry = new ProviderRegistry()
  .register("deepseek", () => new DeepSeekLLMClient());

async function main() {
  const llmClient = await registry.resolve(process.env.LLM_PROVIDER);
  // construct editor, exporters, and Runtime with llmClient
}
```

Do not register `rule-based` in the production entrypoint. Update every Runtime call site listed in this task to pass an explicit provider. Tests and eval may explicitly instantiate `RuleBasedLLMClient`.

- [ ] **Step 7: Run tests and verify GREEN**

```bash
npx vitest run tests/runtime-provider-routing.test.ts tests/deepseek-client.test.ts tests/workflow-e2e.test.ts tests/acceptance-v0.4.test.ts
npm run typecheck
```

Expected: selected tests PASS and typecheck exits 0.

- [ ] **Step 8: Commit**

```bash
git add src/llm src/runtime src/index.ts src/utils/errors.ts tests eval examples codex-agent/cli/run.ts
git commit -m "fix: route production generation through DeepSeek without fallback"
```

## Task 3: Require Assertion Titles and Complete Semantic Layout Content from DeepSeek

**Files:**

- Create: `src/quality/assertion-title.ts`
- Modify: `src/llm/deepseek-client.ts`
- Modify: `src/runtime/storyline-planner.ts`
- Modify: `src/runtime/review-engine.ts`
- Modify: `src/schema/review.schema.ts`
- Test: `tests/deepseek-client.test.ts`
- Test: `tests/review-engine.test.ts`

- [ ] **Step 1: Write failing assertion-title tests**

Add to `tests/review-engine.test.ts`:

```ts
import { isAssertionTitle } from "../src/quality/assertion-title.js";

describe("assertion slide titles", () => {
  it("rejects generic section labels", () => {
    expect(isAssertionTitle("背景与趋势")).toBe(false);
    expect(isAssertionTitle("关键洞察")).toBe(false);
    expect(isAssertionTitle("目标架构")).toBe(false);
  });

  it("accepts a title that states the primary conclusion", () => {
    expect(isAssertionTitle(
      "统一控制面让 Agent 负载获得端到端资源保障"
    )).toBe(true);
  });
});
```

- [ ] **Step 2: Add a failing DeepSeek prompt-contract test**

Expose prompt construction as package-private exported helpers:

```ts
export function buildDeckPrompt(input: DeckGeneratorInput): string
```

Then test:

```ts
it("deck prompt requires rich semantic layouts", () => {
  const prompt = buildDeckPrompt({
    topic: "Agent OS",
    slide_count: 8,
    style_id: "allen_huawei_tech",
    storyline: mockStoryline() as any,
  });
  expect(prompt).toContain("architecture_with_notes");
  expect(prompt).toContain("key_technology_quadrants");
  expect(prompt).toContain("assertion-style title");
  expect(prompt).toContain("\"emphasis\": true");
  expect(prompt).toContain("3 or 4 key_technologies");
});
```

- [ ] **Step 3: Run and verify RED**

```bash
npx vitest run tests/review-engine.test.ts tests/deepseek-client.test.ts
```

Expected: FAIL because the assertion helper and semantic prompt contract do not exist.

- [ ] **Step 4: Implement assertion-title validation**

Create `src/quality/assertion-title.ts`:

```ts
const GENERIC_TITLES = new Set([
  "背景与趋势",
  "关键洞察",
  "目标架构",
  "关键技术",
  "方案对比",
  "总结与下一步",
  "技术路径",
]);

export function isAssertionTitle(title: string): boolean {
  const normalized = title.trim().replace(/[：:]\s*$/, "");
  if (GENERIC_TITLES.has(normalized)) return false;
  return normalized.length >= 12;
}
```

Add `"generic_section_title"` to `IssueTypeEnum`. `ReviewEngine` reports it as medium for non-title and non-agenda slides.

- [ ] **Step 5: Replace DeepSeek prompts with the approved contract**

The storyline prompt must require:

```text
- Every ordinary slide title is an assertion that states the slide's conclusion.
- Do not use bare section labels such as 背景与趋势, 关键洞察, 目标架构, or 关键技术.
- Include at least one architecture_with_notes slide.
- Include at least one key_technology_quadrants slide for a technical report.
```

The Deck prompt must include exact JSON examples:

```json
{
  "type": "architecture",
  "layout_variant": "architecture_with_notes",
  "architecture_content": {
    "diagram": {
      "direction": "layered",
      "nodes": [{"id": "runtime", "label": "Agent Runtime"}],
      "edges": []
    },
    "key_technologies": [
      {
        "id": "scheduling",
        "title": "Agent-aware 调度",
        "body": [
          {"text": "识别 prefill 与 decode 阶段，"},
          {"text": "动态调整 QoS", "emphasis": true}
        ]
      }
    ]
  }
}
```

The prompt states that `key_technologies` contains exactly three or four cards and gives a complete `key_technology_quadrants` example with challenge, architecture, details, and benefits.

- [ ] **Step 6: Validate provider output**

After `DeckSchema.safeParse`, verify every non-cover title with `isAssertionTitle`. Reject invalid titles with `PROVIDER_RESPONSE_INVALID`. Zod already rejects missing semantic slots.

- [ ] **Step 7: Run tests and verify GREEN**

```bash
npx vitest run tests/deepseek-client.test.ts tests/review-engine.test.ts
npm run typecheck
```

Expected: selected tests PASS and typecheck exits 0.

- [ ] **Step 8: Commit**

```bash
git add src/llm/deepseek-client.ts src/quality/assertion-title.ts src/runtime src/schema/review.schema.ts tests
git commit -m "feat: require assertion titles and semantic slide content"
```

## Task 4: Render Rich Text, Styled Cards, and White Title Areas

**Files:**

- Create: `tests/rich-text-exporter.test.ts`
- Modify: `src/layout/layout-utils.ts`
- Modify: `src/layout/layouts/title.layout.ts`
- Modify: `src/export/pptx-exporter.ts`
- Modify: `src/quality/layout-quality-gate.ts`
- Modify: `tests/layout-engine.test.ts`
- Modify: `tests/layout-quality-gate.test.ts`

- [ ] **Step 1: Write failing rich-text and card layout tests**

Create `tests/rich-text-exporter.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { PptxExporter } from "../src/export/pptx-exporter.js";
import { LayoutEngine } from "../src/layout/layout-engine.js";
import { getStyleById } from "../src/styles/index.js";

describe("rich text and cards", () => {
  const exporter = new PptxExporter(new LayoutEngine());
  const style = getStyleById("allen_huawei_tech");

  it("maps emphasis runs to blue Microsoft YaHei text", () => {
    const runs = exporter.toPptxTextRuns([
      { text: "普通文字" },
      { text: "重点文字", emphasis: true, bold: true },
    ], style);
    expect(runs).toEqual([
      {
        text: "普通文字",
        options: { color: "1F2937", fontFace: "Microsoft YaHei" },
      },
      {
        text: "重点文字",
        options: {
          color: "0000FF",
          fontFace: "Microsoft YaHei",
          bold: true,
        },
      },
    ]);
  });

  it("creates a card with approved visual tokens", () => {
    const card = cardElement({
      x: 1,
      y: 1,
      w: 4,
      h: 2,
      title: "关键技术",
      body_runs: [{ text: "统一资源治理" }],
      style,
    });
    expect(card.border_color).toBe("D9D9D9");
    expect(card.title_fill).toBe("CCECFF");
    expect(card.title_color).toBe("1F2937");
  });
});
```

- [ ] **Step 2: Add failing header-style tests**

Add to `tests/layout-engine.test.ts`:

```ts
it("renders ordinary titles as 24pt red text on white", () => {
  const slide = engine.layout(makeDeck()).slides[2];
  const title = slide.elements.find(
    element => element.kind === "text" && element.role === "title"
  );
  expect(title).toMatchObject({
    font_size: 24,
    color: "A80000",
    font_face: "Microsoft YaHei",
  });
  const topBackground = slide.elements.find(
    element => element.kind === "shape" && element.y === 0
  );
  expect(topBackground).toMatchObject({ fill: "FFFFFF" });
});
```

- [ ] **Step 3: Run and verify RED**

```bash
npx vitest run tests/rich-text-exporter.test.ts tests/layout-engine.test.ts
```

Expected: FAIL because rich-text conversion, styled card helpers, and the white title area do not exist.

- [ ] **Step 4: Extend layout helpers**

Change `TextOpts`:

```ts
text?: string;
runs?: RichText;
font_face?: string;
min_font_size?: number;
semantic_role?: string;
```

`textElement` rejects both-or-neither text sources.

Change `CardOpts`:

```ts
title: string;
body_runs: RichText;
style: StyleProfile;
```

`cardElement` returns:

```ts
{
  id: generateId("el"),
  kind: "card" as const,
  x: opts.x,
  y: opts.y,
  w: opts.w,
  h: opts.h,
  title: opts.title,
  body_runs: opts.body_runs,
  title_fill: opts.style.colors.card_title_background,
  title_color: opts.style.colors.card_title_text,
  body_fill: opts.style.colors.card_background,
  border_color: opts.style.colors.card_border,
}
```

- [ ] **Step 5: Render the approved title areas**

`buildPageHeader` emits:

1. a white page background;
2. red 24 pt Microsoft YaHei title text;
3. a `0.02` inch gray divider below the title.

`layoutTitleSlide` uses `cover_title_size` 36 and the same title color.

- [ ] **Step 6: Add rich-text conversion and card rendering**

Make `toPptxTextRuns` public for focused tests:

```ts
toPptxTextRuns(runs: RichText, style: StyleProfile) {
  return runs.map(run => ({
    text: run.text,
    options: {
      color: run.emphasis ? style.colors.emphasis : style.colors.text,
      fontFace: style.typography.font_face,
      ...(run.bold ? { bold: true } : {}),
    },
  }));
}
```

`renderText` sends either the plain string or converted runs to `slide.addText`.

`renderCard` draws in this order:

1. white round rectangle with gray border;
2. light-blue title rectangle covering the top `0.42` inches;
3. dark title text in Microsoft YaHei;
4. rich body runs below the title.

All body text uses `Math.max(el.min_font_size ?? 12, el.font_size ?? 14)`.

- [ ] **Step 7: Strengthen layout quality checks**

`LayoutQualityGate` reports a high issue when:

- a body text element is below 12 pt;
- a non-cover title is not 24 pt;
- a text element font face is not Microsoft YaHei for `allen_huawei_tech`;
- a card does not match the configured border or title fill.

- [ ] **Step 8: Run tests and verify GREEN**

```bash
npx vitest run tests/rich-text-exporter.test.ts tests/layout-engine.test.ts tests/layout-quality-gate.test.ts tests/pptx-exporter.test.ts
npm run typecheck
```

Expected: selected tests PASS and typecheck exits 0.

- [ ] **Step 9: Commit**

```bash
git add src/layout src/export/pptx-exporter.ts src/quality/layout-quality-gate.ts tests
git commit -m "feat: render rich text cards and approved slide styling"
```

## Task 5: Implement Editable Native Diagram Placement

**Files:**

- Create: `src/layout/diagram-layout.ts`
- Test: `tests/architecture-with-notes-layout.test.ts`
- Modify: `src/layout/layout-utils.ts`
- Modify: `src/export/pptx-exporter.ts`

- [ ] **Step 1: Write failing diagram placement tests**

Create the initial portion of `tests/architecture-with-notes-layout.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { layoutDiagram } from "../src/layout/diagram-layout.js";

const diagram = {
  direction: "layered" as const,
  nodes: [
    { id: "app", label: "Agent 应用", group: "应用层" },
    { id: "runtime", label: "Agent Runtime", group: "运行时层" },
    { id: "kernel", label: "Kernel Control Plane", group: "内核层" },
  ],
  edges: [
    { from: "app", to: "runtime", relation: "calls" },
    { from: "runtime", to: "kernel", relation: "controls" },
  ],
};

describe("native diagram layout", () => {
  it("places every node inside the requested region", () => {
    const elements = layoutDiagram(diagram, {
      x: 0.6, y: 1.2, w: 7.5, h: 5.7,
    });
    const nodes = elements.filter(element => element.semantic_role === "diagram-node");
    expect(nodes).toHaveLength(3);
    for (const node of nodes) {
      expect(node.x).toBeGreaterThanOrEqual(0.6);
      expect(node.y).toBeGreaterThanOrEqual(1.2);
      expect(node.x + node.w).toBeLessThanOrEqual(8.1);
      expect(node.y + node.h).toBeLessThanOrEqual(6.9);
    }
  });

  it("emits connectors before nodes", () => {
    const elements = layoutDiagram(diagram, {
      x: 0.6, y: 1.2, w: 7.5, h: 5.7,
    });
    const lastConnector = elements.map(element => element.semantic_role)
      .lastIndexOf("diagram-edge");
    const firstNode = elements.findIndex(
      element => element.semantic_role === "diagram-node"
    );
    expect(lastConnector).toBeLessThan(firstNode);
  });
});
```

- [ ] **Step 2: Run and verify RED**

```bash
npx vitest run tests/architecture-with-notes-layout.test.ts
```

Expected: FAIL because `layoutDiagram` does not exist.

- [ ] **Step 3: Implement deterministic diagram placement**

Extend `ShapeOpts` and `LineOpts` in `src/layout/layout-utils.ts`:

```ts
export interface ShapeOpts {
  x: number;
  y: number;
  w: number;
  h: number;
  shape: "rect" | "roundRect" | "line";
  fill?: string;
  stroke?: string;
  semantic_role?: string;
}

export interface LineOpts {
  x: number;
  y: number;
  w: number;
  h: number;
  color?: string;
  width?: number;
  end_arrow?: "none" | "triangle";
  semantic_role?: string;
}
```

Create:

```ts
export interface DiagramRegion {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function layoutDiagram(
  diagram: SlideDiagram,
  region: DiagramRegion,
  style = getStyleById("allen_huawei_tech")
): LayoutElement[] {
  const direction = diagram.direction ?? "layered";
  const lanes: Array<typeof diagram.nodes> = [];

  if (direction === "layered") {
    const laneIndex = new Map<string, number>();
    for (const node of diagram.nodes) {
      const group = node.group ?? "default";
      if (!laneIndex.has(group)) {
        laneIndex.set(group, lanes.length);
        lanes.push([]);
      }
      lanes[laneIndex.get(group)!].push(node);
    }
  } else if (direction === "left-right") {
    lanes.push([...diagram.nodes]);
  } else {
    for (const node of diagram.nodes) lanes.push([node]);
  }

  const laneGap = 0.28;
  const nodeGap = 0.22;
  const nodeH = 0.64;
  const laneH = Math.min(
    nodeH,
    (region.h - Math.max(0, lanes.length - 1) * laneGap) / lanes.length
  );
  const positions = new Map<string, {
    x: number; y: number; w: number; h: number;
  }>();

  lanes.forEach((lane, laneNumber) => {
    const nodeW = Math.min(
      2.1,
      (region.w - Math.max(0, lane.length - 1) * nodeGap) / lane.length
    );
    const laneWidth = lane.length * nodeW +
      Math.max(0, lane.length - 1) * nodeGap;
    const startX = region.x + (region.w - laneWidth) / 2;
    const y = direction === "left-right"
      ? region.y + (region.h - laneH) / 2
      : region.y + laneNumber * (laneH + laneGap);
    lane.forEach((node, nodeNumber) => {
      positions.set(node.id, {
        x: startX + nodeNumber * (nodeW + nodeGap),
        y,
        w: nodeW,
        h: laneH,
      });
    });
  });

  const elements: LayoutElement[] = [];
  for (const edge of diagram.edges) {
    const from = positions.get(edge.from);
    const to = positions.get(edge.to);
    if (!from || !to) {
      throw new Error(
        `Diagram edge references missing node: ${edge.from} -> ${edge.to}`
      );
    }
    const x1 = from.x + from.w / 2;
    const y1 = from.y + from.h / 2;
    const x2 = to.x + to.w / 2;
    const y2 = to.y + to.h / 2;
    elements.push(lineElement({
      x: x1,
      y: y1,
      w: x2 - x1,
      h: y2 - y1,
      color: style.colors.border,
      width: 1,
      end_arrow: "triangle",
      semantic_role: "diagram-edge",
    }));
  }

  for (const node of diagram.nodes) {
    const position = positions.get(node.id)!;
    elements.push(shapeElement({
      ...position,
      shape: "roundRect",
      fill: style.colors.card_background,
      stroke: style.colors.card_border,
      semantic_role: "diagram-node",
    }));
    elements.push(textElement({
      text: node.label,
      ...position,
      role: "label",
      font_size: style.typography.body_size,
      font_face: style.typography.font_face,
      color: style.colors.text,
      bold: true,
      semantic_role: "diagram-node-label",
    }));
  }
  return elements;
}
```

Use a node height of `0.64`, horizontal and vertical gaps of at least `0.22`, and cap node width so every node remains inside `region`. Reject edges whose endpoints do not exist.

Each connector is a `LineElement` with `end_arrow: "triangle"` and `semantic_role: "diagram-edge"`. Node shape and label elements use `semantic_role: "diagram-node"`.

- [ ] **Step 4: Render arrowed connectors**

In `PptxExporter.renderLine`, map:

```ts
endArrowType: el.end_arrow === "triangle" ? "triangle" : "none",
```

Create lines before node shapes by preserving element order.

- [ ] **Step 5: Run tests and verify GREEN**

```bash
npx vitest run tests/architecture-with-notes-layout.test.ts tests/pptx-exporter.test.ts
npm run typecheck
```

Expected: selected tests PASS and typecheck exits 0.

- [ ] **Step 6: Commit**

```bash
git add src/layout/diagram-layout.ts src/layout/layout-utils.ts src/export/pptx-exporter.ts tests/architecture-with-notes-layout.test.ts
git commit -m "feat: add editable native diagram layout"
```

## Task 6: Implement the Architecture-With-Notes Layout

**Files:**

- Create: `src/layout/layouts/architecture-with-notes.layout.ts`
- Modify: `src/layout/layout-engine.ts`
- Modify: `tests/architecture-with-notes-layout.test.ts`
- Modify: `tests/layout-engine.test.ts`

- [ ] **Step 1: Add the failing composition test**

Append:

```ts
import { LayoutEngine } from "../src/layout/layout-engine.js";
import { getStyleById } from "../src/styles/index.js";

it("uses a 62/38 diagram and notes composition", () => {
  const style = getStyleById("allen_huawei_tech");
  const slide = {
    slide_id: "architecture",
    type: "architecture" as const,
    title: "统一控制面让 Agent 负载获得端到端资源保障",
    layout_variant: "architecture_with_notes" as const,
    layers: [],
    architecture_content: {
      diagram,
      key_technologies: [
        { id: "qos", title: "QoS", body: [{ text: "阶段感知调度" }] },
        { id: "memory", title: "内存", body: [{ text: "模型分片与复用" }] },
        { id: "security", title: "安全", body: [{ text: "最小权限工具调用" }] },
      ],
    },
  };
  const elements = new LayoutEngine().layoutSlide(slide, style);
  const nodes = elements.filter(element => element.semantic_role === "diagram-node");
  const cards = elements.filter(element => element.kind === "card");
  expect(nodes.every(node => node.x + node.w <= 8.35)).toBe(true);
  expect(cards).toHaveLength(3);
  expect(cards.every(card => card.x >= 8.55)).toBe(true);
});
```

- [ ] **Step 2: Run and verify RED**

```bash
npx vitest run tests/architecture-with-notes-layout.test.ts
```

Expected: FAIL because LayoutEngine still routes every architecture slide to the full-width layered layout.

- [ ] **Step 3: Implement the new layout**

Use:

```ts
const contentX = 0.6;
const contentY = 1.15;
const contentW = style.canvas.width - 1.2;
const contentH = style.canvas.height - 1.65;
const gap = 0.28;
const diagramW = (contentW - gap) * 0.62;
const notesW = contentW - gap - diagramW;
```

Render the diagram inside the left region. Divide the right region into equal-height cards with `0.18` inch gaps. Use three or four cards only. Emit the page background and page header before content.

- [ ] **Step 4: Route by layout variant**

In `LayoutEngine.layoutSlide`:

```ts
if (
  slide.type === "architecture" &&
  slide.layout_variant === "architecture_with_notes"
) {
  return layoutArchitectureWithNotes(slide, style);
}
```

Then retain the legacy architecture fallback.

- [ ] **Step 5: Run tests and verify GREEN**

```bash
npx vitest run tests/architecture-with-notes-layout.test.ts tests/layout-engine.test.ts tests/layout-quality-gate.test.ts
npm run typecheck
```

Expected: selected tests PASS and typecheck exits 0.

- [ ] **Step 6: Commit**

```bash
git add src/layout/layouts/architecture-with-notes.layout.ts src/layout/layout-engine.ts tests
git commit -m "feat: add left-diagram right-notes architecture layout"
```

## Task 7: Implement the Key-Technology Quadrants Layout

**Files:**

- Create: `src/layout/layouts/key-technology-quadrants.layout.ts`
- Create: `tests/key-technology-quadrants-layout.test.ts`
- Modify: `src/layout/layout-engine.ts`
- Modify: `tests/layout-engine.test.ts`

- [ ] **Step 1: Write the failing quadrant test**

Create:

```ts
import { describe, expect, it } from "vitest";
import { LayoutEngine } from "../src/layout/layout-engine.js";
import { getStyleById } from "../src/styles/index.js";

describe("key technology quadrants", () => {
  it("places challenge, diagram, details, and benefits in fixed quadrants", () => {
    const slide = {
      slide_id: "technology",
      type: "insight" as const,
      title: "Agent-aware 调度把模型阶段映射为可治理的执行单元",
      layout_variant: "key_technology_quadrants" as const,
      key_points: [],
      key_technology_content: {
        challenge: {
          id: "challenge",
          title: "当前挑战",
          body: [{ text: "持续 Agent 任务争抢 CPU、NPU 与内存带宽" }],
        },
        architecture: {
          direction: "left-right" as const,
          nodes: [
            { id: "observe", label: "阶段识别" },
            { id: "policy", label: "QoS 策略" },
            { id: "execute", label: "异构调度" },
          ],
          edges: [
            { from: "observe", to: "policy" },
            { from: "policy", to: "execute" },
          ],
        },
        details: {
          id: "details",
          title: "关键技术",
          body: [{ text: "将 prefill、decode 和工具调用映射为独立调度实体" }],
        },
        benefits: {
          id: "benefits",
          title: "预期收益",
          body: [
            { text: "降低尾延迟并提高 " },
            { text: "资源利用率", emphasis: true },
          ],
        },
      },
    };
    const elements = new LayoutEngine().layoutSlide(
      slide,
      getStyleById("allen_huawei_tech")
    );
    const byRole = (role: string) => elements.filter(
      element => element.semantic_role === role
    );
    expect(byRole("challenge-card").every(element => element.y < 4)).toBe(true);
    expect(byRole("technology-diagram").every(element => element.y >= 4)).toBe(true);
    expect(byRole("details-card").every(element => element.x >= 6.8)).toBe(true);
    expect(byRole("benefits-card").every(
      element => element.x >= 6.8 && element.y >= 4
    )).toBe(true);
  });
});
```

- [ ] **Step 2: Run and verify RED**

```bash
npx vitest run tests/key-technology-quadrants-layout.test.ts
```

Expected: FAIL because the layout variant is not routed or rendered.

- [ ] **Step 3: Implement the two-by-two composition**

Use a content region below the header with:

```ts
const gapX = 0.28;
const gapY = 0.24;
const colW = (contentW - gapX) / 2;
const rowH = (contentH - gapY) / 2;
```

Place:

- challenge card at `(leftX, topY)`;
- diagram at `(leftX, bottomY)`;
- details card at `(rightX, topY)`;
- benefits card at `(rightX, bottomY)`.

Assign each returned element the semantic role asserted by the test. Use `layoutDiagram` for the lower-left region.

- [ ] **Step 4: Route the new variant**

In `LayoutEngine.layoutSlide`:

```ts
if (
  slide.type === "insight" &&
  slide.layout_variant === "key_technology_quadrants"
) {
  return layoutKeyTechnologyQuadrants(slide, style);
}
```

- [ ] **Step 5: Run tests and verify GREEN**

```bash
npx vitest run tests/key-technology-quadrants-layout.test.ts tests/layout-engine.test.ts tests/layout-quality-gate.test.ts
npm run typecheck
```

Expected: selected tests PASS and typecheck exits 0.

- [ ] **Step 6: Commit**

```bash
git add src/layout/layouts/key-technology-quadrants.layout.ts src/layout/layout-engine.ts tests
git commit -m "feat: add key technology quadrant layout"
```

## Task 8: Replace the Broken PDF Renderer with LibreOffice Conversion

**Files:**

- Create: `src/export/libreoffice-pdf-converter.ts`
- Create: `tests/libreoffice-pdf-converter.test.ts`
- Create: `tests/pdf-export-integration.test.ts`
- Modify: `src/export/pdf-exporter.ts`
- Modify: `src/runtime/presentation-runtime.ts`
- Modify: `src/index.ts`
- Modify: `src/utils/errors.ts`
- Modify: `tests/workflow-e2e.test.ts`
- Modify: `tests/acceptance-v0.4.test.ts`
- Modify: `eval/run-eval.ts`
- Modify: `examples/run-e2e.ts`
- Modify: `codex-agent/cli/run.ts`

- [ ] **Step 1: Write failing converter tests with an injected command runner**

Create `tests/libreoffice-pdf-converter.test.ts`:

```ts
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import {
  LibreOfficePdfConverter,
  type CommandRunner,
} from "../src/export/libreoffice-pdf-converter.js";

async function twoPagePdf(): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  document.setSubject("PDF conversion regression ".repeat(100));
  document.addPage();
  document.addPage();
  return document.save();
}

describe("LibreOfficePdfConverter", () => {
  it("returns a converted PDF with the expected page count", async () => {
    const runner: CommandRunner = async (_binary, args) => {
      const outputDir = args[args.indexOf("--outdir") + 1];
      await writeFile(path.join(outputDir, "input.pdf"), await twoPagePdf());
    };
    const converter = new LibreOfficePdfConverter({
      binary: "fake-soffice",
      runner,
    });
    const result = await converter.convert(Buffer.from("pptx"), 2);
    expect(result.subarray(0, 4).toString()).toBe("%PDF");
  });

  it("rejects a page-count mismatch", async () => {
    const runner: CommandRunner = async (_binary, args) => {
      const outputDir = args[args.indexOf("--outdir") + 1];
      const document = await PDFDocument.create();
      document.addPage();
      await writeFile(path.join(outputDir, "input.pdf"), await document.save());
    };
    const converter = new LibreOfficePdfConverter({
      binary: "fake-soffice",
      runner,
    });
    await expect(converter.convert(Buffer.from("pptx"), 2))
      .rejects.toMatchObject({ code: "PDF_PAGE_COUNT_MISMATCH" });
  });

  it("reports a missing executable", async () => {
    const converter = new LibreOfficePdfConverter({
      binary: "missing-soffice",
      runner: async () => {
        const error = new Error("ENOENT") as NodeJS.ErrnoException;
        error.code = "ENOENT";
        throw error;
      },
    });
    await expect(converter.convert(Buffer.from("pptx"), 1))
      .rejects.toMatchObject({ code: "LIBREOFFICE_NOT_FOUND" });
  });
});
```

- [ ] **Step 2: Write a failing PdfExporter delegation test**

Create `tests/pdf-export-integration.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { PdfExporter } from "../src/export/pdf-exporter.js";

describe("PdfExporter", () => {
  it("converts the PPTX produced by the PPTX exporter", async () => {
    const calls: Buffer[] = [];
    const pptxExporter = {
      export: async () => Buffer.from("pptx-source"),
    };
    const converter = {
      convert: async (input: Buffer, pages: number) => {
        calls.push(input);
        expect(pages).toBe(2);
        return Buffer.from("%PDF-converted");
      },
    };
    const exporter = new PdfExporter(pptxExporter as any, converter as any);
    const result = await exporter.export({
      deck_id: "deck",
      version: 1,
      title: "Deck",
      topic: "Deck",
      style_id: "allen_huawei_tech",
      slides: [
        { slide_id: "one", type: "title", title: "One" },
        { slide_id: "two", type: "title", title: "Two" },
      ],
      created_at: "2026-06-30T00:00:00.000Z",
      updated_at: "2026-06-30T00:00:00.000Z",
    });
    expect(calls[0].toString()).toBe("pptx-source");
    expect(result.toString()).toBe("%PDF-converted");
  });
});
```

- [ ] **Step 3: Run and verify RED**

```bash
npx vitest run tests/libreoffice-pdf-converter.test.ts tests/pdf-export-integration.test.ts
```

Expected: FAIL because the converter does not exist and PdfExporter still draws with Helvetica.

- [ ] **Step 4: Add explicit PDF error codes**

Add:

```ts
LIBREOFFICE_NOT_FOUND: "LIBREOFFICE_NOT_FOUND",
PDF_CONVERSION_FAILED: "PDF_CONVERSION_FAILED",
PDF_CONVERSION_TIMEOUT: "PDF_CONVERSION_TIMEOUT",
PDF_OUTPUT_MISSING: "PDF_OUTPUT_MISSING",
PDF_PAGE_COUNT_MISMATCH: "PDF_PAGE_COUNT_MISMATCH",
```

- [ ] **Step 5: Implement the converter**

Use:

```ts
export type CommandRunner = (
  binary: string,
  args: string[],
  options: { timeout: number }
) => Promise<void>;
```

The default runner wraps promisified `execFile`.

`convert`:

1. creates `mkdtemp(path.join(os.tmpdir(), "presentation-pdf-"))`;
2. writes `input.pptx`;
3. runs:

```ts
[
  "--headless",
  "--convert-to", "pdf",
  "--outdir", tempDir,
  inputPath,
]
```

4. reads `input.pdf`;
5. loads it with `PDFDocument.load`;
6. checks `getPageCount() === expectedPages`;
7. checks buffer length is greater than 1,000 bytes;
8. removes the temp directory in `finally`.

Resolve the binary as:

```ts
options.binary ??
process.env.LIBREOFFICE_BIN ??
"soffice"
```

Map `ENOENT`, timeout, missing output, conversion failure, and page mismatch to their explicit error codes.

- [ ] **Step 6: Replace PdfExporter implementation**

`PdfExporter` becomes:

```ts
export class PdfExporter {
  constructor(
    private pptxExporter: Pick<PptxExporter, "export">,
    private converter: Pick<LibreOfficePdfConverter, "convert">
  ) {}

  async export(deck: Deck): Promise<Buffer> {
    const pptx = await this.pptxExporter.export(deck);
    return this.converter.convert(pptx, deck.slides.length);
  }
}
```

Delete PDF element drawing and its empty catch.

- [ ] **Step 7: Update construction**

Production:

```ts
const pptxExporter = new PptxExporter(layoutEngine);
const pdfConverter = new LibreOfficePdfConverter();
const pdfExporter = new PdfExporter(pptxExporter, pdfConverter);
```

Tests inject a fake converter unless they explicitly test real LibreOffice.

- [ ] **Step 8: Run tests and verify GREEN**

```bash
npx vitest run tests/libreoffice-pdf-converter.test.ts tests/pdf-export-integration.test.ts tests/workflow-e2e.test.ts
npm run typecheck
```

Expected: selected tests PASS and typecheck exits 0.

- [ ] **Step 9: Commit**

```bash
git add src/export src/runtime src/index.ts src/utils/errors.ts tests eval examples codex-agent/cli/run.ts
git commit -m "fix: convert final PPTX to non-empty Chinese PDF"
```

## Task 9: End-to-End Quality Gates and Visual Verification

**Files:**

- Modify: `src/quality/layout-quality-gate.ts`
- Modify: `src/runtime/review-engine.ts`
- Modify: `eval/run-eval.ts`
- Modify: `examples/run-e2e.ts`
- Modify: `docs/evaluation.md`
- Modify: `README.md`
- Modify: existing tests whose fixtures require new style fields.

- [ ] **Step 1: Add failing variant-quality tests**

Add to `tests/layout-quality-gate.test.ts`:

```ts
it("rejects a generic ordinary-slide title", () => {
  const result = gate.validateSlide({
    slide: {
      slide_id: "architecture",
      type: "architecture",
      title: "目标架构",
      layers: [],
    },
    elements: [],
  }, style);
  expect(result.issues.some(
    issue => issue.type === "generic_section_title"
  )).toBe(true);
});

it("rejects body text below 12pt", () => {
  const result = gate.validate([{
    id: "small",
    kind: "text",
    x: 1,
    y: 1,
    w: 4,
    h: 1,
    text: "too small",
    role: "body",
    font_size: 11,
    font_face: "Microsoft YaHei",
    color: style.colors.text,
  }], style);
  expect(result.issues.some(
    issue => issue.type === "font_below_minimum"
  )).toBe(true);
});
```

- [ ] **Step 2: Run and verify RED**

```bash
npx vitest run tests/layout-quality-gate.test.ts
```

Expected: FAIL because slide-level assertion checks and minimum-font issue types do not exist.

- [ ] **Step 3: Extend issue types and gates**

Add:

```ts
"generic_section_title",
"font_below_minimum",
"style_token_mismatch",
"missing_layout_variant_content",
```

`LayoutQualityGate.validateSlide` combines Deck semantics and layout elements. High-severity issues block export for:

- missing required variant content;
- elements outside their assigned architecture or quadrant region;
- unintended overlaps;
- body text below 12 pt;
- font face other than Microsoft YaHei under `allen_huawei_tech`;
- wrong card border or title fill.

Generic titles are medium during review and high before production export.

- [ ] **Step 4: Update evaluation**

`eval/run-eval.ts` must:

- use the configured DeepSeek provider;
- read the complete research report;
- require at least one slide for each new layout variant;
- require zero high-severity layout issues;
- export both PPTX and PDF;
- compare PDF pages with Deck slides;
- print both artifact paths.

Update `docs/evaluation.md` with these exact gates.

- [ ] **Step 5: Update the E2E example**

`examples/run-e2e.ts`:

- resolves DeepSeek through `ProviderRegistry`;
- reads `/Users/allen/codex-workspace/ppt-agent/Agentic AI时代端侧负载变化与操作系统内核演进报告.md`;
- passes the report as `research_brief`;
- exports final PPTX and PDF;
- prints:

```ts
console.error(`PPTX_PATH=${pptx.file_path}`);
console.error(`PDF_PATH=${pdf.file_path}`);
```

- [ ] **Step 6: Document production dependencies**

README documents:

```bash
export LLM_PROVIDER=deepseek
export DEEPSEEK_API_KEY
export LIBREOFFICE_BIN="$(command -v soffice)"
test -x "$LIBREOFFICE_BIN"
```

It states that Microsoft YaHei must be installed in the conversion environment to guarantee exact font rendering; otherwise LibreOffice may substitute another CJK font.

- [ ] **Step 7: Run the complete automated suite**

```bash
npm test
npm run typecheck
git diff --check
```

Expected: zero failing test files, zero failing tests, typecheck exit 0, and no whitespace errors.

- [ ] **Step 8: Generate final regression artifacts**

Use an environment with a valid DeepSeek key and working LibreOffice:

```bash
test -n "$DEEPSEEK_API_KEY"
test -x "$LIBREOFFICE_BIN"
run_log=/tmp/presentation-agent-rich-layout-e2e.log
LLM_PROVIDER=deepseek \
  DEEPSEEK_API_KEY="$DEEPSEEK_API_KEY" \
  LIBREOFFICE_BIN="$LIBREOFFICE_BIN" \
  npx tsx examples/run-e2e.ts 2>&1 | tee "$run_log"
pptx_path=$(sed -n 's/^PPTX_PATH=//p' "$run_log" | tail -1)
pdf_path=$(sed -n 's/^PDF_PATH=//p' "$run_log" | tail -1)
test -f "$pptx_path"
test -f "$pdf_path"
```

- [ ] **Step 9: Render every PPTX and PDF page**

```bash
PRESENTATIONS_SKILL_DIR=/Users/allen/.codex/plugins/cache/openai-primary-runtime/presentations/26.623.12021/skills/presentations
PDF_BIN_DIR=/Users/allen/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin
rm -rf /tmp/presentation-rich-pptx /tmp/presentation-rich-pdf

python3 "$PRESENTATIONS_SKILL_DIR/container_tools/render_slides.py" \
  "$pptx_path" \
  --output_dir /tmp/presentation-rich-pptx

"$PDF_BIN_DIR/pdftoppm" -png -r 120 \
  "$pdf_path" \
  /tmp/presentation-rich-pdf/page

python3 "$PRESENTATIONS_SKILL_DIR/container_tools/create_montage.py" \
  --input_dir /tmp/presentation-rich-pptx \
  --output_file /tmp/presentation-rich-pptx.png \
  --label_mode filename

python3 "$PRESENTATIONS_SKILL_DIR/container_tools/create_montage.py" \
  --input_dir /tmp/presentation-rich-pdf \
  --output_file /tmp/presentation-rich-pdf.png \
  --label_mode filename

python3 "$PRESENTATIONS_SKILL_DIR/container_tools/slides_test.py" \
  "$pptx_path"
```

Inspect every full-resolution PNG. Acceptance requires:

- PDF and PPTX show the same visible Chinese content;
- architecture slides use left diagram and right key-technology cards;
- key-technology slides use all four required quadrants;
- backgrounds are pure white;
- ordinary titles are red, 24 pt, and assertion-style;
- cover title is 36 pt;
- body text is at least 12 pt;
- emphasis runs are blue;
- card borders are gray and card title regions are light blue;
- no clipped, overlapping, or low-contrast content.

- [ ] **Step 10: Commit**

```bash
git add src eval examples docs README.md tests
git commit -m "test: enforce rich layout style and PDF regression quality"
```

## Final Acceptance Checklist

- [ ] Runtime uses the configured DeepSeek provider for initial generation.
- [ ] DeepSeek never silently falls back to deterministic generation.
- [ ] Generic section-label titles are rejected for ordinary slides.
- [ ] `architecture_with_notes` renders an editable left diagram and right cards.
- [ ] `key_technology_quadrants` renders challenge, architecture, details, and benefits.
- [ ] `allen_huawei_tech` uses white backgrounds and Microsoft YaHei.
- [ ] Ordinary titles are red and exactly 24 pt.
- [ ] Cover titles are 36 pt.
- [ ] Body text never drops below 12 pt.
- [ ] Emphasis runs are blue.
- [ ] Cards use gray borders and light-blue title regions.
- [ ] PDF is converted from the final PPTX through LibreOffice.
- [ ] Chinese text is visible in every rendered PDF page.
- [ ] PDF and PPTX page counts match.
- [ ] Full automated tests and type checking pass.
- [ ] Final PPTX and PDF are rendered and visually inspected page by page.
