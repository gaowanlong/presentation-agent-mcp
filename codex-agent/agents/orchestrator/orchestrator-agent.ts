import { MessageBus, createMessage, SemanticMessage } from "../../core/message-bus.js";
import { AgentType } from "../../core/semantic-message.js";
import { ContractRegistry } from "../contracts/contract-registry.js";
import { IntentRouter } from "../../core/intent-router.js";
import { NegotiationEngine } from "../../core/negotiation-engine.js";
import { ExecutionGraphRuntime } from "../../core/execution-graph.js";
import { GraphStateManager } from "../../core/graph-state-manager.js";
import { StateMachine } from "../../core/state-machine.js";
import { Replanner } from "../../core/replanner.js";
import { PlannerAgent } from "../planner/planner-agent.js";
import { ReviewerAgent } from "../reviewer/reviewer-agent.js";
import { FixerAgent } from "../fixer/fixer-agent.js";
import type { MCPClient } from "../../mcp/mcp-client.js";

export class OrchestratorAgent {
  private bus = new MessageBus();
  private contracts = new ContractRegistry();
  private router = new IntentRouter();
  private negotiator = new NegotiationEngine();
  private graph = new ExecutionGraphRuntime();
  private stateMgr = new GraphStateManager();
  private replanner = new Replanner();
  private sm = new StateMachine();
  private planner: PlannerAgent;
  private reviewer: ReviewerAgent;
  private fixer: FixerAgent;
  private context: any = {};

  constructor(private mcpClient: MCPClient) {
    this.contracts.registerDefaults();
    this.planner = new PlannerAgent(this.bus, this.contracts);
    this.reviewer = new ReviewerAgent(this.bus, this.contracts);
    this.fixer = new FixerAgent(this.bus, this.contracts);
  }

  async run(text: string): Promise<{ artifact: any }> {
    this.sm.transition("PLANNING");
    this.bus.send(createMessage("orchestrator", "planner", "build_slide_plan", "Generate slide plan", { artifacts: { text } }));

    let planMsg: SemanticMessage | null = null;
    while (!planMsg) await this.dispatchCycle();
    planMsg = this.bus.receive("orchestrator");
    if (!planMsg || planMsg.intent === "build_slide_plan") {
      this.sm.transition("EXECUTING");
      const completed = new Set<string>();
      let loops = 0;
      while (loops < 5) {
        loops++;
        await this.dispatchCycle();
        const ready = this.graph.getReadyNodes(completed);
        for (const node of ready) {
          this.bus.send(createMessage("orchestrator", "executor", "execute_tool", "Execute " + node.tool, { artifacts: { node, context: this.context } }));
        }
        await this.dispatchCycle();
        if (this.context.deck_id) {
          this.sm.transition("REVIEWING");
          this.bus.send(createMessage("orchestrator", "reviewer", "evaluate_quality", "Review deck", { artifacts: { deck: this.context } }));
          await this.dispatchCycle();
          const reviewResult = this.bus.receive("orchestrator");
          const score = reviewResult?.context?.artifacts?.score ?? 100;
          if (score < 75) {
            this.sm.transition("REPLANNING");
            this.bus.send(createMessage("orchestrator", "fixer", "fix_issues", "Fix low score", { artifacts: { deck: this.context, issues: reviewResult?.context?.artifacts?.issues } }));
            await this.dispatchCycle();
            const conflicts = this.bus.detect_conflict();
            if (conflicts.length > 0) this.negotiator.resolve(conflicts, this.bus.getHistory());
            continue;
          }
        }
        break;
      }
      this.sm.transition("EXPORTING");
      if (this.context.deck_id) {
        this.bus.send(createMessage("orchestrator", "executor", "execute_tool", "Export PPTX", { artifacts: { node: { id: "export", tool: "export_pptx", input: { deck_id: this.context.deck_id } }, context: this.context } }));
        await this.dispatchCycle();
      }
    }
    this.sm.transition("DONE");
    return { artifact: this.context.last_artifact };
  }

  private async dispatchCycle(): Promise<void> {
    const agents: AgentType[] = ["planner", "executor", "reviewer", "fixer"];
    for (const agent of agents) {
      const msg = this.bus.receive(agent);
      if (!msg) continue;
      const validation = this.contracts.validate(agent, msg);
      if (!validation.valid) { console.error("[Orchestrator] Contract violation:", validation.errors); continue; }
      switch (agent) {
        case "planner": await this.planner.handleMessage(msg); break;
        case "reviewer": await this.reviewer.handleMessage(msg); break;
        case "fixer": await this.fixer.handleMessage(msg); break;
        case "executor": {
          const { node, context } = msg.context.artifacts || {};
          if (!node) break;
          try {
            const input = { ...node.input };
            if (context?.deck_id && !input.deck_id) input.deck_id = context.deck_id;
            const output = await this.mcpClient.call(node.tool, input);
            if (node.tool === "create_deck" && output?.deck_id) this.context.deck_id = output.deck_id;
            if (node.tool === "export_pptx" && output) this.context.last_artifact = output;
            this.bus.send(createMessage("executor", "orchestrator", "execute_tool", "Executed " + node.tool, { artifacts: { output } }));
          } catch (e: any) { console.error("[Executor] Failed:", e.message); }
          break;
        }
      }
    }
  }

  getStateMachine() { return this.sm; }
  getBus() { return this.bus; }
  getContracts() { return this.contracts; }
}

