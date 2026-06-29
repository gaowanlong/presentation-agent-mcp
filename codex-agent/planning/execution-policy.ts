export class ExecutionPolicy {
  shouldReplan(result: any): boolean { if (!result) return false; if (result.score !== undefined && result.score < 60) return true; return false; }
  shouldInjectStep(result: any): boolean { return result?.missing_types?.length > 0; }
  shouldRetry(_step: any, attempts: number): boolean { return attempts < 1; }
  decide_replan(intent: string, score: number): boolean { if (intent === "evaluate_quality" && score < 75) return true; return false; }
  decide_negotiation(conflict: any): boolean { return conflict?.type === "quality_vs_complexity" || conflict?.type === "intent_mismatch"; }
  decide_agent_override(): boolean { return false; }
}

