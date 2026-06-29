export type ExecutionTrace = {
  step_id: string;
  tool: string;
  input: any;
  output: any;
  status: "success" | "failed" | "fallback";
  duration_ms: number;
};