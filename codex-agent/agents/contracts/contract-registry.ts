import { AgentContract } from "./agent-contract.js";
import { AgentType, SemanticMessage } from "../../core/semantic-message.js";

export class ContractRegistry {
  private contracts = new Map<AgentType, AgentContract>();
  register(c: AgentContract) { this.contracts.set(c.agent, c); }
  get(agent: AgentType): AgentContract | undefined { return this.contracts.get(agent); }

  validate(agent: AgentType, msg: SemanticMessage): { valid: boolean; errors: string[] } {
    const c = this.contracts.get(agent);
    if (!c) return { valid: false, errors: ["No contract: " + agent] };
    const errs: string[] = [];
    if (!c.allowed_intents.includes(msg.intent)) errs.push("Intent '" + msg.intent + "' not allowed for " + agent + ". Allowed: " + c.allowed_intents.join(", "));
    if (c.forbidden_actions.some(f => msg.context.constraints?.includes(f))) errs.push("Forbidden action in constraints");
    return { valid: errs.length === 0, errors: errs };
  }

  getAllowedIntents(agent: AgentType): string[] { return this.contracts.get(agent)?.allowed_intents || []; }

  registerDefaults() {
    this.register({ agent: "planner", description: "Generates slide plans and execution graphs", allowed_intents: ["build_slide_plan", "generate_execution_graph"], forbidden_actions: ["execute_mcp", "mutate_graph"], input_fields: ["text"], output_fields: ["slidePlan", "execPlan"] });
    this.register({ agent: "executor", description: "Executes MCP tool calls", allowed_intents: ["execute_tool"], forbidden_actions: ["planning", "scoring", "mutate_graph"], input_fields: ["node", "tool"], output_fields: ["output"] });
    this.register({ agent: "reviewer", description: "Evaluates deck quality and detects issues", allowed_intents: ["evaluate_quality", "detect_issues"], forbidden_actions: ["execute_mcp", "mutate_graph"], input_fields: ["deck"], output_fields: ["score", "issues", "recommendation"] });
    this.register({ agent: "fixer", description: "Generates patches and intent corrections", allowed_intents: ["fix_issues", "correct_intent"], forbidden_actions: ["execute_mcp", "planning"], input_fields: ["deck", "issues"], output_fields: ["patches", "intent_corrections"] });
    this.register({ agent: "orchestrator", description: "Routes messages and controls execution", allowed_intents: ["route", "dispatch", "replan", "negotiate"], forbidden_actions: ["execute_mcp", "direct_mutation"], input_fields: ["message"], output_fields: ["graph"] });
  }
}

