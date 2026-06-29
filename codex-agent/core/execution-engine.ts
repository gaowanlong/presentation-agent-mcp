import type { MCPClient } from "../mcp/mcp-client.js";
import { ContextStore } from "./context-store.js";
import { TraceWriter } from "./trace-writer.js";
import { StateMachine } from "./state-machine.js";
import { ExecutionGraphRuntime } from "./execution-graph.js";
import { GraphStateManager, NodeStatus } from "./graph-state-manager.js";
import { Replanner } from "./replanner.js";
import { ExecutionPolicy } from "../planning/execution-policy.js";
import { ToolPolicy } from "../planning/tool-policy.js";
import { ExecutionPlan } from "../types/execution-plan.js";
import { ExecutionTraceGraph, TraceNode, TraceEdge } from "../types/trace.js";
import { ToolRegistry, validateTool } from "../mcp/tool-registry.js";

export class ExecutionEngine {
  private sm = new StateMachine();
  private graphRuntime = new ExecutionGraphRuntime();
  private stateMgr = new GraphStateManager();
  private replanner = new Replanner();
  private execPolicy = new ExecutionPolicy();
  private toolPolicy = new ToolPolicy();

  constructor(private context: ContextStore, private trace: TraceWriter) {}

  async run(plan: ExecutionPlan, client: MCPClient): Promise<ExecutionTraceGraph> {
    this.sm.transition("PLANNING");
    this.sm.transition("EXECUTING");
    this.graphRuntime = new ExecutionGraphRuntime(plan);
    this.stateMgr.init(plan.steps);

    const nodes: TraceNode[] = [];
    const edges: TraceEdge[] = [];
    for (const step of plan.steps) {
      if (step.depends_on) for (const d of step.depends_on) edges.push({ from: d, to: step.id, type: "depends_on" });
    }

    const completed = new Set<string>();
    let toolFailures = 0;
    const mutations: string[] = [];

    // Build edges
    for (const step of plan.steps) {
      if (step.depends_on) for (const d of step.depends_on) edges.push({ from: d, to: step.id, type: "depends_on" });
    }

    // DAG execution with replanning
    while (this.graphRuntime.hasPending(completed)) {
      const ready = this.graphRuntime.getReadyNodes(completed);
      if (ready.length === 0 && this.graphRuntime.hasPending(completed)) {
        // Deadlock → replan
        this.sm.transition("REPLANNING");
        const replanResult = this.replanner.replan(this.graphRuntime.toGraph(), { tool_failures: toolFailures, review_score: 50 });
        this.graphRuntime = new ExecutionGraphRuntime();
        for (const n of replanResult.graph.nodes) this.graphRuntime.addNode(n);
        this.stateMgr.init(replanResult.graph.nodes);
        for (const m of replanResult.mutations) mutations.push(m.detail);
        this.sm.transition("EXECUTING");
        continue;
      }

      for (const step of ready) {
        const beforeState = this.sm.getState();
        this.stateMgr.setStatus(step.id, "running");
        const start = Date.now();
        let status: NodeStatus = "success";
        let output: any = null;

        try {
          validateTool(step.tool);
          output = await client.call(step.tool, step.input);
          if (step.tool === "create_deck" && output?.deck_id) this.context.set("deck_id", output.deck_id);
          if (step.tool === "export_pptx" && output) this.context.set("last_artifact", output);
          
          // Check if replanning needed
          if (this.execPolicy.shouldReplan(output)) {
            this.sm.transition("REPLANNING");
            const ctx: any = { tool_failures };
            if (output?.score !== undefined) ctx.review_score = output.score;
            const replanResult = this.replanner.replan(this.graphRuntime.toGraph(), ctx);
            this.graphRuntime = new ExecutionGraphRuntime();
            for (const n of replanResult.graph.nodes) this.graphRuntime.addNode(n);
            this.stateMgr.init(replanResult.graph.nodes);
            for (const m of replanResult.mutations) mutations.push(m.detail);
            this.sm.transition("EXECUTING");
          }
        } catch (e: any) {
          toolFailures++;
          status = step.retry_policy?.fallback === "skip" ? "failed" : "fallback";
          if (this.execPolicy.shouldRetry(step, toolFailures)) {
            this.stateMgr.setStatus(step.id, "pending");
            continue;
          }
        }

        const afterState = this.sm.getState();
        const node: TraceNode = { id: step.id, tool: step.tool, input: step.input, output, state: afterState, status, duration_ms: Date.now() - start };
        nodes.push(node);
        this.trace.addNode({ ...node, state_before: beforeState, state_after: afterState, graph_mutation: undefined });
        this.stateMgr.setStatus(step.id, status);
        completed.add(step.id);
      }
    }

    this.sm.transition("EXPORTING");
    this.sm.transition("DONE");
    return { nodes, edges };
  }

  getStateMachine() { return this.sm; }
  getGraphRuntime() { return this.graphRuntime; }
  getStateManager() { return this.stateMgr; }
}

