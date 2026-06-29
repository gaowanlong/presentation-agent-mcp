import { MessageBus, AgentMessage } from "../../core/message-bus.js";
import { ReviewEngine } from "../../../src/runtime/review-engine.js";

export class ReviewerAgent {
  private engine = new ReviewEngine();

  constructor(private bus: MessageBus) {}

  async handleMessage(msg: AgentMessage): Promise<void> {
    const { deck } = msg.payload || {};
    if (!deck) { this.bus.send("orchestrator", { from: "reviewer", type: "error", payload: { error: "No deck to review" } }); return; }
    try {
      const review = this.engine.review(deck);
      const recommendation = review.score >= 75 ? "ok" : review.score >= 40 ? "fix" : "replan";
      this.bus.send("orchestrator", { from: "reviewer", type: "review", payload: { score: review.score, issues: review.issues, recommendation, review } });
    } catch (e: any) {
      this.bus.send("orchestrator", { from: "reviewer", type: "error", payload: { error: e.message } });
    }
  }
}

