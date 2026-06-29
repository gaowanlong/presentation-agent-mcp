import { MessageBus, AgentMessage } from "../../core/message-bus.js";
import { AutoFixEngine } from "../../../src/autofix/auto-fix-engine.js";
import { ReviewIssue } from "../../../src/schema/review.schema.js";

export class FixerAgent {
  private autoFixEngine = new AutoFixEngine();

  constructor(private bus: MessageBus) {}

  async handleMessage(msg: AgentMessage): Promise<void> {
    const { deck, issues } = msg.payload || {};
    if (!deck) { this.bus.send("orchestrator", { from: "fixer", type: "error", payload: { error: "No deck to fix" } }); return; }
    try {
      const result = this.autoFixEngine.autoFix(deck);
      this.bus.send("orchestrator", { from: "fixer", type: "fix", payload: { patches: result.patches, before_score: result.before_score, after_score: result.after_score, improvements: result.improvements } });
    } catch (e: any) {
      this.bus.send("orchestrator", { from: "fixer", type: "error", payload: { error: e.message } });
    }
  }
}

