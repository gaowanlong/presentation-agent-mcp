export type ExecutionStep = {
  id: string;
  tool: string;
  input: any;
  depends_on?: string[];
  retry_policy?: { max_retry: number; fallback: "rule_based" | "skip" };
};
export type ExecutionPlan = { steps: ExecutionStep[]; };
