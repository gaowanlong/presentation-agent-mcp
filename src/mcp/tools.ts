import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { PresentationRuntime } from "../runtime/presentation-runtime.js";

function textContent(text: string): { type: "text"; text: string } {
  return { type: "text", text };
}

function errorContent(message: string): { type: "text"; text: string } {
  return { type: "text", text: `Error: ${message}` };
}

interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

const toolDefinitions: ToolDefinition[] = [
  {
    name: "create_style_profile",
    description: "Get a configured style profile. Defaults to allen_huawei_tech.",
    inputSchema: {
      type: "object",
      properties: {
        style_id: {
          type: "string",
          enum: ["default", "allen_huawei_tech"],
          description: "风格标识",
          default: "allen_huawei_tech",
        },
      },
    },
  },
  {
    name: "create_storyline",
    description: "Generate a structured storyline for presentation planning. Call before create_deck when you need narrative structure.",
    inputSchema: {
      type: "object",
      properties: {
        topic: { type: "string", description: "主题" },
        audience: { type: "string", description: "受众" },
        purpose: { type: "string", description: "目的" },
        research_brief: { type: "string", description: "研究摘要" },
        slide_count: { type: "number", description: "幻灯片数量", default: 8 },
      },
      required: ["topic"],
    },
  },
  {
    name: "create_deck",
    description: "Create a complete presentation deck. Use after create_storyline or with a clear topic and purpose.",
    inputSchema: {
      type: "object",
      properties: {
        topic: { type: "string", description: "主题" },
        audience: { type: "string", description: "受众" },
        purpose: { type: "string", description: "目的" },
        research_brief: { type: "string", description: "研究摘要" },
        slide_count: { type: "number", description: "幻灯片数量", default: 8 },
        style_id: { type: "string", enum: ["default", "allen_huawei_tech"], description: "风格", default: "allen_huawei_tech" },
      },
      required: ["topic"],
    },
  },
  {
    name: "get_deck",
    description: "Read the full Deck JSON for editing or inspection.",
    inputSchema: {
      type: "object",
      properties: {
        deck_id: { type: "string", description: "Deck ID" },
      },
      required: ["deck_id"],
    },
  },
  {
    name: "review_deck",
    description: "Review a deck for content quality issues. Recommended after create_deck, update_slide, or auto_fix_deck.",
    inputSchema: {
      type: "object",
      properties: {
        deck_id: { type: "string", description: "Deck ID" },
      },
      required: ["deck_id"],
    },
  },
  {
    name: "update_slide",
    description: "Edit a single slide by natural language instruction. Returns a DeckPatch with version history.",
    inputSchema: {
      type: "object",
      properties: {
        deck_id: { type: "string", description: "Deck ID" },
        slide_id: { type: "string", description: "Slide ID" },
        instruction: { type: "string", description: "修改指令" },
      },
      required: ["deck_id", "slide_id", "instruction"],
    },
  },
  {
    name: "export_pptx",
    description: "Export the deck as a downloadable .pptx file. Returns artifact metadata and download URL.",
    inputSchema: {
      type: "object",
      properties: {
        deck_id: { type: "string", description: "Deck ID" },
      },
      required: ["deck_id"],
    },
  },
  {
    name: "export_pdf",
    description: "Export the deck as a lightweight PDF file. Note: PDF uses basic positioning, not full PPT visual fidelity.",
    inputSchema: {
      type: "object",
      properties: {
        deck_id: { type: "string", description: "Deck ID" },
      },
      required: ["deck_id"],
    },
  },
  {
    name: "auto_fix_deck",
    description: "Automatically fix all fixable review issues (weak titles, generic messages, too many bullets, etc.). Use after review_deck.",
    inputSchema: {
      type: "object",
      properties: {
        deck_id: { type: "string", description: "Deck ID" },
      },
      required: ["deck_id"],
    },
  },
];

export function registerToolHandlers(
  server: Server,
  runtime: PresentationRuntime
): void {
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: toolDefinitions.map((def) => ({
        name: def.name,
        description: def.description,
        inputSchema: def.inputSchema as any,
      })),
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case "create_style_profile":
          return await handleCreateStyleProfile(runtime, args);
        case "create_storyline":
          return await handleCreateStoryline(runtime, args);
        case "create_deck":
          return await handleCreateDeck(runtime, args);
        case "get_deck":
          return await handleGetDeck(runtime, args);
        case "review_deck":
          return await handleReviewDeck(runtime, args);
        case "update_slide":
          return await handleUpdateSlide(runtime, args);
        case "export_pptx":
          return await handleExportPptx(runtime, args);
        
        case "auto_fix_deck":
          return await handleAutoFixDeck(runtime, args);
        case "export_pdf":
          return await handleExportPdf(runtime, args);
        default:
          return { content: [textContent(`Unknown tool: ${name}`)], isError: true };
      }
    } catch (err: any) {
      return {
        content: [errorContent(err?.message ?? String(err))],
        isError: true,
      };
    }
  });
}

async function handleCreateStyleProfile(runtime: PresentationRuntime, args: any) {
  const profile = await runtime.createStyleProfile({ style_id: args?.style_id || "allen_huawei_tech" });
  return { content: [textContent(JSON.stringify(profile, null, 2))] };
}

async function handleCreateStoryline(runtime: PresentationRuntime, args: any) {
  const storyline = await runtime.createStoryline({
    topic: args?.topic || "",
    audience: args?.audience,
    purpose: args?.purpose,
    research_brief: args?.research_brief,
    slide_count: args?.slide_count ?? 8,
  });
  return { content: [textContent(JSON.stringify(storyline, null, 2))] };
}

async function handleCreateDeck(runtime: PresentationRuntime, args: any) {
  const deck = await runtime.createDeck({
    topic: args?.topic || "",
    audience: args?.audience,
    purpose: args?.purpose,
    research_brief: args?.research_brief,
    slide_count: args?.slide_count ?? 8,
    style_id: args?.style_id || "allen_huawei_tech",
  });
  return {
    content: [textContent(JSON.stringify({
      deck_id: deck.deck_id,
      version: deck.version,
      title: deck.title,
      slide_count: deck.slides.length,
      slides: deck.slides.map((s: any) => ({
        slide_id: s.slide_id,
        type: s.type,
        title: s.title,
      })),
    }, null, 2))],
  };
}

async function handleGetDeck(runtime: PresentationRuntime, args: any) {
  const deck = await runtime.getDeck(args?.deck_id || "");
  return { content: [textContent(JSON.stringify(deck, null, 2))] };
}

async function handleReviewDeck(runtime: PresentationRuntime, args: any) {
  const review = await runtime.reviewDeck(args?.deck_id || "");
  return { content: [textContent(JSON.stringify(review, null, 2))] };
}

async function handleUpdateSlide(runtime: PresentationRuntime, args: any) {
  const result = await runtime.updateSlide({
    deck_id: args?.deck_id || "",
    slide_id: args?.slide_id || "",
    instruction: args?.instruction || "",
  });
  return { content: [textContent(JSON.stringify(result, null, 2))] };
}

async function handleExportPptx(runtime: PresentationRuntime, args: any) {
  const result = await runtime.exportPptx(args?.deck_id || "");
  return { content: [textContent(JSON.stringify(result, null, 2))] };
}


async function handleExportPdf(runtime: PresentationRuntime, args: any) {
  const result = await runtime.exportPdf(args?.deck_id || "");
  return { content: [textContent(JSON.stringify(result, null, 2))] };
}

async function handleAutoFixDeck(runtime: PresentationRuntime, args: any) {
  const result = await runtime.autoFixDeck(args?.deck_id || "");
  return { content: [textContent(JSON.stringify(result, null, 2))] };
}