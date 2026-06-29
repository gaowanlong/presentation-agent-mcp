import { parseDeepResearch } from "../planning/deepresearch-parser.js";
import { SlidePlanner } from "../planning/slide-planner.js";
import { mapSlidePlanToExecution } from "../planning/plan-mapper.js";
import { AgentRunner } from "../core/agent-runner.js";
import type { MCPClient } from "../mcp/mcp-client.js";

export async function runPresentation(text: string, mcpClient: MCPClient, opts?: { slide_count?: number }) {
  const research = parseDeepResearch(text);
  const slidePlan = new SlidePlanner().plan(research);
  const execPlan = mapSlidePlanToExecution(slidePlan, { topic: research.topic, slide_count: opts?.slide_count || slidePlan.slides.length });
  const runner = new AgentRunner();
  const graph = await runner.runPlan(execPlan, mcpClient);
  runner.saveTrace();
  const last = graph.nodes[graph.nodes.length - 1];
  return { artifact: last?.output, graph, plan: slidePlan, tracePath: "logs/execution.trace.json" };
}

