import { AgentType, SemanticMessage } from "./semantic-message.js";

const INTENT_MAP: Record<string, { agent: AgentType; tool?: string; priority: number }> = {
  "build_slide_plan": { agent: "planner", priority: 9 },
  "generate_execution_graph": { agent: "planner", priority: 8 },
  "execute_tool": { agent: "executor", priority: 7 },
  "evaluate_quality": { agent: "reviewer", priority: 6 },
  "detect_issues": { agent: "reviewer", priority: 5 },
  "fix_issues": { agent: "fixer", priority: 4 },
  "correct_intent": { agent: "fixer", priority: 3 },
  "replan": { agent: "orchestrator", priority: 9 },
  "negotiate": { agent: "orchestrator", priority: 8 },
  "route": { agent: "orchestrator", priority: 7 },
};

export class IntentRouter {
  resolve(intent: string): AgentType {
    return INTENT_MAP[intent]?.agent || "orchestrator";
  }

  getPriority(intent: string): number {
    return INTENT_MAP[intent]?.priority || 0;
  }

  mapToTool(intent: string): string | undefined {
    return INTENT_MAP[intent]?.tool;
  }

  getAllIntents(): string[] { return Object.keys(INTENT_MAP); }

  route(msg: SemanticMessage): AgentType {
    return this.resolve(msg.intent);
  }
}

