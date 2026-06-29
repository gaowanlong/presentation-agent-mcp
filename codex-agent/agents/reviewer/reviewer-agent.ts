import { MessageBus, SemanticMessage, createMessage } from "../../core/message-bus.js";
import { ReviewEngine } from "../../../src/runtime/review-engine.js";
import { ContractRegistry } from "../contracts/contract-registry.js";

export class ReviewerAgent {
  private engine = new ReviewEngine();
  constructor(private bus: MessageBus, private contracts: ContractRegistry) {}

  async handleMessage(msg: SemanticMessage): Promise<void> {
    const deck = msg.context.artifacts?.deck;
    if (!deck) { this.bus.send(createMessage("reviewer", "orchestrator", "evaluate_quality", "No deck", { priority: "high" })); return; }
    const review = this.engine.review(deck);
    const semantic_issues = {
      intent_mismatch: review.issues.some(i => i.type === "weak_message" || i.type === "weak_title"),
      weak_reasoning: review.issues.some(i => i.type === "missing_evidence_for_claim" || i.type === "generic_message"),
      missing_tradeoffs: review.issues.some(i => i.type === "unbalanced_comparison"),
    };
    const recommendation = review.score >= 75 ? "ok" : review.score >= 40 ? "fix" : "replan";
    this.bus.send(createMessage("reviewer", "orchestrator", "evaluate_quality", "Quality evaluated", { artifacts: { score: review.score, issues: review.issues, semantic_issues, recommendation, review }, expected_outcome: recommendation === "ok" ? "Proceed" : recommendation === "fix" ? "Fix issues" : "Replan" }));
  }
}

