# Evaluation Harness

## Overview

The Evaluation Harness (`eval/run-eval.ts`) provides batch evaluation of the Presentation Agent MCP pipeline. It runs a series of test cases through the complete workflow and validates quality metrics.

## Usage

```bash
npx tsx eval/run-eval.ts
```

The harness will:
1. Load each case from `eval/cases/*.json`
2. Create deck via `create_deck`
3. Review via `review_deck`
4. Auto-fix via `auto_fix_deck`
5. Export via `export_pptx`
6. Validate against quality metrics
7. Output a summary report

## Case Definition

Each case is a JSON file in `eval/cases/`:

```json
{
  "name": "Case Name",
  "topic": "Presentation topic",
  "audience": "Target audience",
  "purpose": "Presentation purpose",
  "research_brief_file": "/path/to/research.md",
  "slide_count": 8,
  "style_id": "allen_huawei_tech",
  "metrics": {
    "required_slide_types": ["architecture", "summary"],
    "required_keywords": ["Agent", "OS"],
    "min_review_score_before_autofix": 0,
    "min_review_score_after_autofix": 60,
    "max_duplicate_titles": 1,
    "has_architecture_slide": true,
    "has_summary_slide": true
  }
}
```

## Quality Metrics

| Metric | Description | When Checked |
|--------|-------------|-------------|
| `required_slide_types` | Deck must contain all specified slide types | Before auto-fix |
| `required_keywords` | Keywords must appear somewhere in the deck | Before auto-fix |
| `min_review_score_before_autofix` | Minimum review score before fixing | Before auto-fix |
| `min_review_score_after_autofix` | Minimum review score after auto-fix | After auto-fix |
| `max_duplicate_titles` | Maximum allowed duplicate slide titles | Before auto-fix |
| `has_architecture_slide` | Deck must have an architecture slide | Before auto-fix |
| `has_summary_slide` | Deck must have a summary slide | Before auto-fix |

## Built-in Cases

1. **AgentOS Kernel Architecture** — Research-brief-driven deck about end-side OS evolution
2. **Harmony PC Agent Desktop** — Architecture and UX design for Harmony PC agent
3. **KV Cache Memory Management** — Technical deep-dive on LLM KV cache optimization
4. **Presentation Agent MCP** — Self-referential deck about this project itself

## Notes

- All cases run with `rule-based` provider by default (no API key required)
- The evaluation script outputs a report with per-metric pass/fail status
- A case passes only when ALL metrics pass
