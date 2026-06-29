import { MessageBus } from "../../core/message-bus.js";
import { PlannerAgent } from "../planner/planner-agent.js";
import { ExecutorAgent } from "../executor/executor-agent.js";
import { ReviewerAgent } from "../reviewer/reviewer-agent.js";
import { FixerAgent } from "../fixer/fixer-agent.js";
import { ExecutionGraphRuntime } from "../../core/execution-graph.js";
import { GraphStateManager } from "../../core/graph-state-manager.js";
import { Replanner } from "../../core/replanner.js";
import { StateMachine } from "../../core/state-machine.js";
import { TraceWriter } from "../../core/trace-writer.js";
import type { MCPClient } from "../../mcp/mcp-client.js";

export class OrchestratorAgent {
  private bus = new MessageBus();
  private planner = new PlannerAgent(this.bus);
  private executor: ExecutorAgent;
  private reviewer = new ReviewerAgent(this.bus);
  private fixer = new FixerAgent(this.bus);
  private graph = new ExecutionGraphRuntime();
  private stateMgr = new GraphStateManager();
  private replanner = new Replanner();
  private sm = new StateMachine();
  private trace = new TraceWriter();
  private context: any = {};

  constructor(private mcpClient: MCPClient) { this.executor = new ExecutorAgent(this.bus, mcpClient); }

  async run(text: string): Promise<{ artifact: any; trace: any }> {
    // Phase 1: Plan
    this.sm.transition("PLANNING");
    this.bus.send("planner", { from: "orchestrator", type: "plan", payload: { text } });
    let planMsg = this.bus.receive("orchestrator");
    while (!planMsg || planMsg.type === "error") { await this.tick(); planMsg = this.bus.receive("orchestrator"); }
    const { execPlan } = planMsg.payload;
    this.graph = new ExecutionGraphRuntime(execPlan);
    this.stateMgr.init(execPlan.steps);

    // Phase 2: Execute + Review + Fix loop
    let totalScore = 0;
    let loopCount = 0;
    const maxLoops = 5;

    while (this.graph.hasPending(new Set()) && loopCount < maxLoops) {
      loopCount++;
      this.sm.transition("EXECUTING");
      const completed = new Set<string>();
      while (this.graph.hasPending(completed)) {
        const ready = this.graph.getReadyNodes(completed);
        if (ready.length === 0) break;
        for (const node of ready) {
          this.bus.send("executor", { from: "orchestrator", type: "execute", payload: { node, context: this.context } });
          await this.tick();
          const execResult = this.bus.receive("orchestrator");
          if (execResult) completed.add(node.id);
        }
      }

      // Review
      this.sm.transition("REVIEWING");
      if (this.context.deck_id) {
        const { generateDeck } = await import("../../runtime/deck-generator.js");
        // Send review request
        this.bus.send("reviewer", { from: "orchestrator", type: "review", payload: { deck: this.context } });
        await this.tick();
        const reviewResult = this.bus.receive("orchestrator");
        if (reviewResult?.payload?.score !== undefined) totalScore = reviewResult.payload.score;

        // Fix if needed
        if (totalScore < 75) {
          this.sm.transition("FIXING");
          this.bus.send("fixer", { from: "orchestrator", type: "fix", payload: { deck: this.context } });
          await this.tick();
          const fixResult = this.bus.receive("orchestrator");
          if (fixResult?.payload) {
            // Re-execute if fixes applied
            this.sm.transition("REPLANNING");
            continue;
          }
        }
      }
    }

    // Phase 3: Export
    this.sm.transition("EXPORTING");
    if (this.context.deck_id) {
      this.bus.send("executor", { from: "orchestrator", type: "execute", payload: { node: { id: "export", tool: "export_pptx", input: { deck_id: this.context.deck_id } }, context: this.context } });
      await this.tick();
      const exportResult = this.bus.receive("orchestrator");
      this.sm.transition("DONE");
      return { artifact: exportResult?.payload?.output, trace: this.trace };
    }
    this.sm.transition("FAILED");
    return { artifact: null, trace: this.trace };
  }

  private async tick(): Promise<void> {
    // Process all pending messages
    let msg = this.bus.receive("planner");
    if (msg) await this.planner.handleMessage(msg);
    msg = this.bus.receive("executor");
    if (msg) await this.executor.handleMessage(msg);
    msg = this.bus.receive("reviewer");
    if (msg) await this.reviewer.handleMessage(msg);
    msg = this.bus.receive("fixer");
    if (msg) await this.fixer.handleMessage(msg);
  }

  getStateMachine() { return this.sm; }
  getTrace() { return this.trace; }
  getBus() { return this.bus; }
  getContext() { return this.context; }
}

