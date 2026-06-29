import { parseDeepResearch } from "../planning/deepresearch-parser.js";
import { SlidePlanner } from "../planning/slide-planner.js";
import { ExecutionPlanner } from "../planning/execution-planner.js";
import { AgentRunner } from "../core/agent-runner.js";
import type { MCPClient } from "../mcp/mcp-client.js";
export async function runPresentation(text: string, mcpClient: MCPClient, opts?: { slide_count?: number }) {
  const research = parseDeepResearch(text);
  const slidePlan = new SlidePlanner().plan(research);
  const execPlan = new ExecutionPlanner().plan(slidePlan, { topic: research.topic, slide_count: opts?.slide_count || slidePlan.slides.length });
  const runner = new AgentRunner();
  const results = await runner.runPlan(execPlan, mcpClient);
  const last = results[results.length - 1];
  return { artifact: last?.output, traces: runner.getTrace().getAll(), plan: slidePlan };
}
