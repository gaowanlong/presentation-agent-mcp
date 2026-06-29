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
    description: "获取内置风格配置",
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
    description: "根据主题、受众、研究摘要生成故事线",
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
    description: "根据主题或 storyline 创建 Deck JSON",
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
    description: "读取 Deck JSON",
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
    description: "审查 PPT 内容结构",
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
    description: "增量修改单页",
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
    description: "导出 PPTX",
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
    description: "导出 PDF",
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
    description: "Auto-fix review issues in a deck",
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