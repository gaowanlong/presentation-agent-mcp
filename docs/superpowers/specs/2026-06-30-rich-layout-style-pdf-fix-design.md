# Rich Layout, Custom Style, and PDF Export Fix Design

## Goal

Fix three production defects:

1. exported PDFs contain shapes but almost no Chinese text;
2. generated slides are too shallow and cannot express the requested architecture and key-technology compositions;
3. the `allen_huawei_tech` style is not applied consistently.

The fix must preserve existing Deck compatibility while making PPTX the single visual source for both PowerPoint and PDF output.

## Confirmed Root Causes

### Empty PDF text

The current PDF exporter uses the standard PDF Helvetica fonts, which cannot encode Chinese. Every `drawText` failure is swallowed by an empty `catch`, so pages retain backgrounds and shapes but lose Chinese text.

### Shallow page content

The production Runtime still calls the deterministic storyline and Deck generators directly. DeepSeek is used only by incremental editing and still silently falls back to the rule-based client.

The current Slide schema and layout engine expose only simple slide-specific fields. They cannot represent a left-diagram/right-explanation architecture slide or a four-quadrant key-technology slide.

### Custom style not applied

`allen_huawei_tech` still uses Arial and the previous palette. The Style schema has no tokens for emphasis text, card-title backgrounds, or card-title text. Text elements also contain only a single plain string, so emphasis cannot be colored independently.

## Production Data Flow

The corrected path is:

```text
MCP create_deck
  -> configured LLM provider
  -> storyline with assertion-style slide titles
  -> Deck with semantic layout variants and rich content
  -> Layout Engine with allen_huawei_tech tokens
  -> PPTX exporter
  -> PPTX file
  -> LibreOffice headless conversion
  -> PDF file
```

The Runtime must use the configured provider for storyline, Deck, and slide edits. Provider errors, invalid JSON, missing required layout content, and configuration errors terminate the request. Production generation never silently falls back to the rule-based client.

## Compatible Deck Extensions

Existing slide types remain valid. New fields are optional so stored Decks can still be loaded.

### Rich text

```ts
type RichTextRun = {
  text: string;
  emphasis?: boolean;
  bold?: boolean;
};

type RichText = RichTextRun[];
```

When `emphasis` is true, the run uses the style emphasis color. Plain-string fields remain supported and are normalized into one non-emphasis run.

### Card content

```ts
type ContentCard = {
  id: string;
  title: string;
  body: RichText;
};
```

Cards always have a title region and a body region. The title region background, title text, body text, border, and fill come from the selected StyleProfile.

### Diagram content

```ts
type DiagramNode = {
  id: string;
  label: string;
  group?: string;
  description?: string;
};

type DiagramEdge = {
  from: string;
  to: string;
  relation?: string;
};

type SlideDiagram = {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  direction?: "left-right" | "top-down" | "layered";
};
```

Only explicitly supplied edges are rendered. The layout engine does not invent relationships.

### Layout variants

Slides receive an optional `layout_variant`:

- `architecture_with_notes`
- `key_technology_quadrants`
- existing type-specific fallback layout

The new semantic fields are:

```ts
type ArchitectureWithNotesContent = {
  diagram: SlideDiagram;
  key_technologies: ContentCard[];
};

type KeyTechnologyQuadrantsContent = {
  challenge: ContentCard;
  architecture: SlideDiagram;
  details: ContentCard;
  benefits: ContentCard;
};
```

## Required Compositions

### Architecture with notes

- usable content area starts below the slide title;
- left side uses approximately 62% of the content width;
- right side uses approximately 38%;
- the left side renders an editable native PowerPoint diagram;
- connectors are created before nodes so they remain behind node labels;
- the right side contains three or four key-technology cards;
- each card explains a mechanism, constraint, or design choice shown by the diagram;
- card content must not repeat the diagram labels without adding technical meaning.

### Key technology quadrants

- upper-left: current challenge;
- lower-left: editable key-technology architecture diagram;
- upper-right: detailed technical explanation;
- lower-right: expected benefits;
- all four areas describe one technical topic;
- benefits distinguish measured evidence from expected outcomes;
- the layout uses a stable two-column, two-row grid with consistent gaps.

## DeepSeek Output Requirements

Storyline generation must produce assertion-style titles that state the slide's primary conclusion. Section-label titles such as “背景与趋势”, “关键洞察”, and “目标架构” are rejected unless followed by a concrete conclusion.

Deck generation must:

- select a suitable `layout_variant`;
- populate every required semantic slot for that variant;
- output structured rich-text runs;
- mark only genuinely important phrases as `emphasis`;
- include three or four architecture key-technology cards;
- populate all four key-technology quadrants;
- preserve source references for numeric claims;
- avoid unsupported numbers and generic placeholder language.

The Provider validates the Deck with Zod. Missing required variant content produces a provider-response error; it does not trigger rule-based fallback.

## `allen_huawei_tech` Style

The existing style ID is overwritten with:

- slide background: `#FFFFFF`;
- font family: `Microsoft YaHei`;
- cover title: 36 pt;
- ordinary slide title: 24 pt;
- ordinary body default: 14 pt;
- ordinary body minimum: 12 pt;
- slide title color: `#A80000`;
- ordinary body color: `#1F2937`;
- emphasis text color: `#0000FF`;
- card border: `#D9D9D9`;
- card body fill: `#FFFFFF`;
- card title-region fill: `#CCECFF`;
- card title text: `#1F2937`;
- muted text: `#6B7280`.

Ordinary slide title areas use a white background, red assertion-style title, and a thin divider. They do not use a solid red banner.

The PPTX records `Microsoft YaHei` as the font face. Rendering environments without the font may substitute a local CJK font, but production deployment should install Microsoft YaHei when licensing permits.

## Layout and Rendering Model

`LayoutElement` gains:

- rich-text runs;
- card title/body geometry;
- explicit line and connector elements;
- node and diagram metadata where needed for quality diagnostics;
- font face and minimum font size;
- semantic role.

The Layout Engine:

- selects the requested layout variant;
- calculates coordinates deterministically;
- keeps text at or above 12 pt;
- condenses or rejects content that does not fit;
- applies all colors and fonts through StyleProfile tokens;
- emits connectors before diagram nodes;
- retains existing layouts as compatibility fallbacks.

The PPTX exporter:

- converts rich-text runs to PptxGenJS text runs;
- colors emphasis runs blue;
- renders cards with gray borders and light-blue title regions;
- uses Microsoft YaHei for every run;
- preserves editable diagram shapes and connectors.

## PDF Export

The independent `pdf-lib` drawing implementation is removed from the production path.

`PdfExporter`:

1. asks `PptxExporter` for the PPTX buffer;
2. writes the PPTX to an isolated temporary directory;
3. invokes a configured LibreOffice/soffice executable in headless mode;
4. reads the converted PDF;
5. verifies that the PDF exists, is non-trivial, and has the same page count as the Deck;
6. removes the temporary directory;
7. returns the PDF buffer.

The executable is resolved from:

1. `LIBREOFFICE_BIN`;
2. `soffice` on `PATH`;
3. `libreoffice` on `PATH`.

Missing LibreOffice, conversion failure, timeout, a zero-page PDF, or a page-count mismatch returns an explicit PDF export error. No text-rendering error is swallowed.

## Quality Gates

Before PPTX export:

- every non-cover title is exactly 24 pt and uses the style title color;
- every non-cover title is an assertion rather than a generic section label;
- body text is at least 12 pt;
- every text element uses Microsoft YaHei;
- emphasis runs use `#0000FF`;
- cards use the configured border and title-region fill;
- required layout-variant slots exist;
- diagram nodes remain inside their region;
- unintended overlaps and out-of-bounds elements are blocking errors.

After PDF conversion:

- PDF page count equals Deck slide count;
- the file passes a minimum size threshold;
- rendered pages contain visible non-background pixels;
- rendered page images are inspected during regression verification.

## Compatibility

Old Decks without `layout_variant`, rich text, cards, or diagrams continue to use existing layouts. Plain strings are converted to non-emphasis runs.

The style ID remains `allen_huawei_tech`, so callers do not change their configuration.

The existing `export_pdf` MCP tool remains stable. Its implementation changes to PPTX conversion internally.

## Testing

### Unit tests

- rich-text schema accepts valid runs and rejects empty runs;
- card and diagram schemas validate required fields;
- style tokens match the approved colors, fonts, and sizes;
- emphasis runs become blue PPTX text runs;
- cards receive gray borders and light-blue title fills;
- assertion-title validation rejects generic titles;
- both new layout variants produce in-bounds non-overlapping elements.

### Provider tests

- Runtime calls the configured provider for storyline and Deck generation;
- DeepSeek failure does not invoke `RuleBasedLLMClient`;
- missing variant slots reject the response;
- prompts require assertion titles, rich text, and complete semantic slots.

### PDF tests

- Chinese PPTX content survives PDF conversion;
- the PDF and PPTX page counts match;
- missing LibreOffice produces an actionable error;
- conversion timeouts and missing output fail explicitly;
- temporary directories are removed after success and failure.

### End-to-end verification

Generate the AgentOS deck through DeepSeek, export both PPTX and PDF, render every page, and inspect:

- architecture pages use left-diagram/right-notes;
- key-technology pages use the required quadrants;
- page backgrounds are pure white;
- slide titles are red, 24 pt, and assertion-style;
- body text is at least 12 pt;
- emphasis text is blue;
- card borders and title fills match the approved style;
- PDF contains the same visible content as PPTX.

## Delivery Order

1. Add schemas and style tokens.
2. Route production generation strictly through the configured provider.
3. Update DeepSeek prompts and response validation.
4. Implement rich-text and card rendering.
5. Implement the architecture-with-notes layout.
6. Implement the key-technology-quadrants layout.
7. Replace PDF drawing with LibreOffice conversion.
8. Add static and rendered regression checks.
9. Generate and inspect final PPTX and PDF artifacts.
