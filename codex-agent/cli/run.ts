import { AgentRunner } from "../core/agent-runner.js";
import { MockMCPClient } from "../mcp/mock-mcp-server.js";
import { PresentationRuntime } from "../../src/runtime/presentation-runtime.js";
import { LayoutEngine } from "../../src/layout/layout-engine.js";
import { ReviewEngine } from "../../src/runtime/review-engine.js";
import { IncrementalEditor } from "../../src/runtime/incremental-editor.js";
import { PatchEngine } from "../../src/patch/patch-engine.js";
import { RuleBasedLLMClient } from "../../src/llm/rule-based-client.js";
import { PptxExporter } from "../../src/export/pptx-exporter.js";
import { PdfExporter } from "../../src/export/pdf-exporter.js";
import { LocalArtifactStore } from "../../src/storage/local-artifact-store.js";

async function main() {
  const file = process.argv[2];
  if (!file) { console.error("Usage: npx tsx codex-agent/cli/run.ts <deepresearch.md>"); process.exit(1); }

  console.error("[Agent] Starting...");
  console.error("[Agent] Parsing", file);

  // Build runtime
  const store = new LocalArtifactStore();
  const layoutEngine = new LayoutEngine();
  const reviewEngine = new ReviewEngine();
  const patchEngine = new PatchEngine();
  const llm = new RuleBasedLLMClient();
  const editor = new IncrementalEditor(reviewEngine, patchEngine, llm);
  const pptxExp = new PptxExporter(layoutEngine);
  const pdfExp = new PdfExporter(layoutEngine);
  const rt = new PresentationRuntime(store, layoutEngine, reviewEngine, editor, pptxExp, pdfExp);
  const mcpClient = new MockMCPClient((tool: string, input: any) => {
    switch (tool) {
      case "create_deck": return rt.createDeck(input);
      case "review_deck": return rt.reviewDeck(input.deck_id || "");
      case "auto_fix_deck": return rt.autoFixDeck(input.deck_id || "");
      case "update_slide": return rt.updateSlide(input);
      case "export_pptx": return rt.exportPptx(input.deck_id || "");
      default: throw new Error("Unknown tool: " + tool);
    }
  });

  const runner = new AgentRunner();
  console.error("[Agent] Building SlidePlan...");
  console.error("[Agent] Building ExecutionPlan...");
  console.error("[Agent] Executing MCP workflow...");
  const result = await runner.runFromFile(file, mcpClient);

  const tracePath = runner.saveTrace();
  console.error("[Agent] Trace saved:", tracePath);
  console.error("[Agent] Artifact:", JSON.stringify(result.artifact || {}, null, 2));
  if (result.artifact?.download_url) console.error("[Agent] Download:", result.artifact.download_url);
  console.error("[Agent] Done.");
}

main().catch((e) => { console.error("[Agent] Failed:", e.message); process.exit(1); });

