import { ExecutionPlan } from "../types/execution-plan.js";
import { ExecutionTraceGraph } from "../types/trace.js";
import type { MCPClient } from "../mcp/mcp-client.js";
import { ContextStore } from "./context-store.js";
import { TraceWriter } from "./trace-writer.js";
import { ExecutionEngine } from "./execution-engine.js";
import { StateMachine } from "./state-machine.js";
import fs from "node:fs";

export class AgentRunner {
  private engine: ExecutionEngine; private context: ContextStore; private trace: TraceWriter; private sm: StateMachine;
  constructor() { this.context = new ContextStore(); this.trace = new TraceWriter(); this.engine = new ExecutionEngine(this.context, this.trace); this.sm = this.engine.getStateMachine(); }

  async runPlan(plan: ExecutionPlan, client: MCPClient): Promise<ExecutionTraceGraph> {
    return this.engine.run(plan, client);
  }

  async runFromFile(deepResearchPath: string, client: MCPClient): Promise<{ graph: ExecutionTraceGraph; artifact: any }> {
    const { parseDeepResearch } = await import("../planning/deepresearch-parser.js");
    const { SlidePlanner } = await import("../planning/slide-planner.js");
    const { mapSlidePlanToExecution } = await import("../planning/plan-mapper.js");
    const { runPresentation } = await import("../workflows/presentation.workflow.js");

    this.sm.transition("PARSED");
    const text = fs.readFileSync(deepResearchPath, "utf-8");
    const research = parseDeepResearch(text);
    this.sm.transition("PLANNED");

    const slidePlan = new SlidePlanner().plan(research);
    const execPlan = mapSlidePlanToExecution(slidePlan, { topic: research.topic, slide_count: slidePlan.slides.length });
    const graph = await this.engine.run(execPlan, client);
    const lastNode = graph.nodes[graph.nodes.length - 1];
    const artifact = lastNode?.output;
    return { graph, artifact };
  }

  getContext() { return this.context; }
  getTrace() { return this.trace; }
  getStateMachine() { return this.sm; }

  saveTrace(filePath?: string): string {
    const p = filePath || "logs/execution.trace.json";
    const dir = p.substring(0, p.lastIndexOf("/"));
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(p, this.trace.toJSON());
    return p;
  }
}

