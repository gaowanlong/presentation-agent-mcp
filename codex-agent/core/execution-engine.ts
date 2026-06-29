console.log(">>> V0.7.1 ENGINE LOADED <<<");
import type { MCPClient } from "../mcp/mcp-client.js";
import { ContextStore } from "./context-store.js";
import { TraceWriter } from "./trace-writer.js";
import { StateMachine } from "./state-machine.js";
import { ExecutionPlan } from "../types/execution-plan.js";
import { ExecutionTraceGraph, TraceNode, TraceEdge } from "../types/trace.js";
import { validateTool } from "../mcp/tool-registry.js";

export class ExecutionEngine {
  private sm: StateMachine;
  constructor(private context: ContextStore, private trace: TraceWriter) { this.sm = new StateMachine(); }

  async run(plan: ExecutionPlan, client: MCPClient): Promise<ExecutionTraceGraph> {
    const nodes: TraceNode[] = [];
    const edges: TraceEdge[] = [];
    const completed = new Set<string>();
    const outputs: Record<string, any> = {};
    this.sm.transition("EXECUTING");

    // Build edges from depends_on
    for (const step of plan.steps) {
      if (step.depends_on) for (const d of step.depends_on) edges.push({ from: d, to: step.id, type: "depends_on" });
    }

    // DAG execution loop
    while (completed.size < plan.steps.length) {
      const ready = plan.steps.filter(s => !completed.has(s.id) && (!s.depends_on || s.depends_on.every(d => completed.has(d))));
      if (ready.length === 0 && completed.size < plan.steps.length) throw new Error("Cycle detected in execution plan");

      for (const step of ready) {
        const start = Date.now();
        let status = "success";
        let output: any = null;

        try {
          validateTool(step.tool);
          // Resolve context placeholders in input
          const input = resolveInput(step.input, outputs);
          output = await client.call(step.tool, input);
          outputs[step.id] = output;
          if (step.tool === "create_deck" && output?.deck_id) this.context.set("deck_id", output.deck_id);
          if (step.tool === "export_pptx" && output) this.context.set("last_artifact", output);
        } catch (e: any) {
          status = step.retry_policy?.fallback === "skip" ? "failed" : "fallback";
        }

        const node: TraceNode = { id: step.id, tool: step.tool, input: step.input, output, state: this.sm.getState(), status, duration_ms: Date.now() - start };
        nodes.push(node);
        this.trace.addNode(node);
        completed.add(step.id);
      }
    }

    for (const e of edges) this.trace.addEdge(e);
    this.sm.transition("DONE");
    return { nodes, edges };
  }

  getStateMachine(): StateMachine { return this.sm; }
}

function resolveInput(input: any, outputs: Record<string, any>): any {
  if (!input || typeof input !== "object") return input;
  const resolved: any = {};
  for (const [k, v] of Object.entries(input)) {
    if (v === "$DECK_ID") { resolved[k] = outputs["create_deck"]?.deck_id; continue; }
    resolved[k] = v;
  }
  return resolved;
}

