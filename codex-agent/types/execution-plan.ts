export type ExecutionPlan = {
  steps: Array<{
    step_id: string;
    tool: string;
    input: any;
    depends_on?: string[];
    retry?: number;
    fallback?: "rule_based" | "skip";
  }>;
};