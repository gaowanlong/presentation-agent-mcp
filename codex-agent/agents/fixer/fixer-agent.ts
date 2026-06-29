import { MessageBus, SemanticMessage, createMessage } from "../../core/message-bus.js";
import { AutoFixEngine } from "../../../src/autofix/auto-fix-engine.js";
import { ContractRegistry } from "../contracts/contract-registry.js";

export class FixerAgent {
  private autoFix = new AutoFixEngine();
  constructor(private bus: MessageBus, private contracts: ContractRegistry) {}

  async handleMessage(msg: SemanticMessage): Promise<void> {
    const deck = msg.context.artifacts?.deck;
    const issues = msg.context.artifacts?.issues;
    if (!deck) { this.bus.send(createMessage("fixer", "orchestrator", "fix_issues", "No deck", { priority: "high" })); return; }
    const result = this.autoFix.autoFix(deck);
    const intent_corrections = result.improvements.filter(i => i.fixed).map(i => ({ node_id: i.issue, new_intent: "corrected_" + i.issue }));
    this.bus.send(createMessage("fixer", "orchestrator", "fix_issues", "Issues fixed", { artifacts: { patches: result.patches, before_score: result.before_score, after_score: result.after_score, improvements: result.improvements, intent_corrections }, expected_outcome: "Score improved" }));
  }
}

