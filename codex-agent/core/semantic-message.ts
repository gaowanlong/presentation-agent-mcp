export type AgentType = "orchestrator" | "planner" | "executor" | "reviewer" | "fixer";

export interface SemanticMessage {
  id: string;
  from: AgentType;
  to: AgentType;
  intent: string;
  context: { goal: string; constraints: string[]; artifacts?: any };
  expected_outcome: string;
  priority: "low" | "medium" | "high";
  timestamp: number;
}

export function createMessage(from: AgentType, to: AgentType, intent: string, goal: string, opts?: { constraints?: string[]; artifacts?: any; expected_outcome?: string; priority?: "low" | "medium" | "high" }): SemanticMessage {
  return { id: "msg_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6), from, to, intent, context: { goal, constraints: opts?.constraints || [], artifacts: opts?.artifacts }, expected_outcome: opts?.expected_outcome || "ok", priority: opts?.priority || "medium", timestamp: Date.now() };
}

