import { PresentationRuntime } from "./runtime/presentation-runtime.js";
import { LayoutEngine } from "./layout/layout-engine.js";
import { ReviewEngine } from "./runtime/review-engine.js";
import { IncrementalEditor } from "./runtime/incremental-editor.js";
import { PatchEngine } from "./patch/patch-engine.js";
import { PptxExporter } from "./export/pptx-exporter.js";
import { PdfExporter } from "./export/pdf-exporter.js";
import { LocalArtifactStore } from "./storage/local-artifact-store.js";
import { RuleBasedLLMClient } from "./llm/rule-based-client.js";
import { DeepSeekLLMClient } from "./llm/deepseek-client.js";
import type { LLMClient } from "./llm/llm-client.js";
import { startMcpServer } from "./mcp/server.js";
import { startRemoteMcpServer } from "./mcp/remote-server.js";

const isRemote = process.argv.includes("--remote") || process.env.REMOTE_MCP === "true";
const port = parseInt(process.env.MCP_PORT || "3000", 10);
const provider = process.env.LLM_PROVIDER || "rule-based";

function createLLMClient(): LLMClient {
  switch (provider) {
    case "deepseek":
      return new DeepSeekLLMClient();
    case "rule-based":
    default:
      return new RuleBasedLLMClient();
  }
}

async function main() {
  const store = new LocalArtifactStore();
  const layoutEngine = new LayoutEngine();
  const reviewEngine = new ReviewEngine();
  const patchEngine = new PatchEngine();
  const llmClient = createLLMClient();
  const incrementalEditor = new IncrementalEditor(reviewEngine, patchEngine, llmClient);
  const pptxExporter = new PptxExporter(layoutEngine);
  const pdfExporter = new PdfExporter(layoutEngine);

  const runtime = new PresentationRuntime(
    store, layoutEngine, reviewEngine, incrementalEditor, pptxExporter, pdfExporter
  );

  if (isRemote) {
    console.error(`Presentation Agent MCP (Remote, provider: ${llmClient.name}) starting on port ${port}...`);
    await startRemoteMcpServer(runtime, port);
  } else {
    console.error(`Presentation Agent MCP (stdio, provider: ${llmClient.name}) starting...`);
    await startMcpServer(runtime);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
