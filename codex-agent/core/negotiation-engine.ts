import { SemanticMessage } from "./semantic-message.js";

export interface Conflict { type: string; messages: SemanticMessage[]; description: string; }
export interface NegotiationResult { resolved: boolean; decisions: string[]; updated_messages: SemanticMessage[]; }

export class NegotiationEngine {
  resolve(conflicts: Conflict[], messages: SemanticMessage[]): NegotiationResult {
    const decisions: string[] = [];
    const updated = [...messages];

    for (const conflict of conflicts) {
      if (conflict.type === "quality_vs_complexity") {
        const review = conflict.messages.find(m => m.intent === "evaluate_quality");
        const plan = conflict.messages.find(m => m.intent === "build_slide_plan");
        if (review && plan && review.context.artifacts?.score < 50) {
          decisions.push("Negotiation: Low score overrides complexity. Reducing slide count and injecting auto-fix.");
          const fixMsg: SemanticMessage = { id: "nego_fix", from: "orchestrator", to: "fixer", intent: "fix_issues", context: { goal: "Fix quality issues", constraints: [], artifacts: { score: review.context.artifacts?.score } }, expected_outcome: "Improved score", priority: "high", timestamp: Date.now() };
          updated.push(fixMsg);
        }
      }
      if (conflict.type === "intent_mismatch") {
        const corrected = conflict.messages.map(m => ({ ...m, intent: "correct_intent" }));
        decisions.push("Negotiation: Intent mismatch detected. Correcting to fixer agent.");
        updated.push(...corrected);
      }
    }
    return { resolved: decisions.length > 0, decisions, updated_messages: updated };
  }
}

