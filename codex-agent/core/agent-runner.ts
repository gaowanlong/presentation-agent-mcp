import { ExecutionPlan } from "../types/execution-plan.js";
import { ExecutionTrace } from "../types/trace.js";
import type { MCPClient } from "../mcp/mcp-client.js";
import { ContextStore } from "./context-store.js";
import { TraceWriter } from "./trace-writer.js";
import { ExecutionEngine } from "./execution-engine.js";
export class AgentRunner {
  private engine: ExecutionEngine; private context: ContextStore; private trace: TraceWriter;
  constructor() { this.context = new ContextStore(); this.trace = new TraceWriter(); this.engine = new ExecutionEngine(this.context, this.trace); }
  async runPlan(plan: ExecutionPlan, client: MCPClient): Promise<ExecutionTrace[]> { return this.engine.run(plan, client); }
  getContext() { return this.context; }
  getTrace() { return this.trace; }
}
