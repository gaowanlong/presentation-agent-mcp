# ChatGPT Developer Mode Integration

## Overview

The Presentation Agent MCP server can be used with ChatGPT Developer Mode (and other MCP-compatible clients) through the Remote MCP (SSE) transport.

## Setup

### 1. Start the Remote MCP Server

```bash
cd presentation-agent-mcp
npm start -- --remote
```

The server will start on `http://localhost:3000` with:
- SSE: `http://localhost:3000/sse`
- POST: `http://localhost:3000/`
- Health: `http://localhost:3000/health`
- Artifact download: `http://localhost:3000/artifacts/:id`

### 2. Configure ChatGPT

In ChatGPT Developer Mode, add an MCP server with:

- **Name**: `presentation-agent`
- **URL**: `http://localhost:3000/sse`
- **Type**: Remote MCP

### 3. MCP Configuration File

Place this `.mcp.json` in your project root:

```json
{
  "mcpServers": {
    "presentation-agent": {
      "description": "Presentation Agent — generate and export PPT/PDF presentations",
      "url": "http://localhost:3000/sse"
    }
  }
}
```

## Bearer Token Auth (Optional)

Set the `AUTH_TOKEN` environment variable to enable authentication:

```bash
AUTH_TOKEN=your-secret-token npm start -- --remote
```

ChatGPT must then include the `Authorization: Bearer your-secret-token` header.

## Available Tools

| Tool | When to Use |
|------|------------|
| `create_deck` | Create a new presentation deck from a topic |
| `review_deck` | Review deck for content quality |
| `auto_fix_deck` | Auto-fix review issues |
| `update_slide` | Edit a single slide |
| `export_pptx` | Download as PowerPoint |
| `export_pdf` | Download as PDF (lightweight) |
| `create_storyline` | Plan the narrative structure |
| `get_deck` | Inspect the full Deck JSON |

## Example Workflow

```
1. create_deck(topic: "AI Architecture")
2. review_deck(deck_id)
3. auto_fix_deck(deck_id)
4. review_deck(deck_id)          # Verify fixes
5. export_pptx(deck_id)          # Download PPTX
   → Returns artifact_id, download_url, size_bytes
```

## Notes

- Default provider is `rule-based` (no API key needed)
- Set `LLM_PROVIDER=deepseek` with `DEEPSEEK_API_KEY` for LLM-powered content
- Export files are available for download via `/artifacts/:id`
