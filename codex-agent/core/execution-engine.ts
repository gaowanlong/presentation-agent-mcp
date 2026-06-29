import type { MCPClient } from "../mcp/mcp-client.js";
import { ContextStore } from "./context-store.js";
import { TraceWriter } from "./trace-writer.js";
import { ExecutionPlan } from "../types/execution-plan.js";
import { ExecutionTrace } from "../types/trace.js";
export class ExecutionEngine {
  constructor(private context: ContextStore, private trace: TraceWriter) {}
  async run(plan: ExecutionPlan, client: MCPClient): Promise<ExecutionTrace[]> {
    const results: ExecutionTrace[] = [];
    for (const step of plan.steps) {
      const start = Date.now(); let status: ExecutionTrace["status"] = "success"; let output: any = null;
      try {
        output = await client.call(step.tool, step.input);
        if (step.tool === "create_deck" && output?.deck_id) this.context.set("deck_id", output.deck_id);
        if (step.tool === "export_pptx" && output) this.context.set("last_artifact", output);
      } catch (e: any) { status = step.fallback === "skip" ? "failed" : "fallback"; }
      const trace: ExecutionTrace = { step_id: step.step_id, tool: step.tool, input: step.input, output, status, duration_ms: Date.now() - start };
      this.trace.add(trace); results.push(trace);
    }
    return results;
  }
}
