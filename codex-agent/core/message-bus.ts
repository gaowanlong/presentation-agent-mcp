import { SemanticMessage, createMessage, AgentType } from "./semantic-message.js";

export { AgentType, SemanticMessage, createMessage };

export class MessageBus {
  private queues = new Map<string, SemanticMessage[]>();
  private history: SemanticMessage[] = [];

  send(msg: SemanticMessage) {
    const key = msg.to;
    if (!this.queues.has(key)) this.queues.set(key, []);
    this.queues.get(key)!.push(msg);
    this.history.push(msg);
  }

  receive(agent: AgentType): SemanticMessage | null {
    const q = this.queues.get(agent);
    if (!q || q.length === 0) return null;
    return q.shift()!;
  }

  route_by_intent(intent: string): SemanticMessage[] {
    return this.history.filter(m => m.intent === intent);
  }

  detect_conflict(): Array<{ type: string; messages: SemanticMessage[]; description: string }> {
    const conflicts: Array<{ type: string; messages: SemanticMessage[]; description: string }> = [];
    const reviews = this.history.filter(m => m.intent === "evaluate_quality");
    const plans = this.history.filter(m => m.intent === "build_slide_plan");
    if (reviews.length > 0 && plans.length > 0) {
      const lastReview = reviews[reviews.length - 1];
      const lastPlan = plans[plans.length - 1];
      if (lastReview.context.artifacts?.score < 50 && lastPlan.context.artifacts?.slides?.length > 5)
        conflicts.push({ type: "quality_vs_complexity", messages: [lastReview, lastPlan], description: "Low score despite complex plan" });
    }
    return conflicts;
  }

  rewrite_message(id: string, updates: Partial<SemanticMessage>): boolean {
    const msg = this.history.find(m => m.id === id);
    if (!msg) return false;
    Object.assign(msg, updates);
    return true;
  }

  getHistory(): SemanticMessage[] { return [...this.history]; }
  pendingCount(agent: AgentType): number { return (this.queues.get(agent) || []).length; }
  clear() { this.queues.clear(); this.history = []; }
}

