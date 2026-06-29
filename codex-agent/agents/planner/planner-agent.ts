import { MessageBus, AgentMessage } from "../../core/message-bus.js";
import { parseDeepResearch } from "../../planning/deepresearch-parser.js";
import { SlidePlanner } from "../../planning/slide-planner.js";
import { mapSlidePlanToExecution } from "../../planning/plan-mapper.js";

export class PlannerAgent {
  constructor(private bus: MessageBus) {}

  async handleMessage(msg: AgentMessage): Promise<void> {
    const text = msg.payload?.text || "";
    if (!text) { this.bus.send("orchestrator", { from: "planner", type: "error", payload: { error: "No input text" } }); return; }
    const research = parseDeepResearch(text);
    const slidePlan = new SlidePlanner().plan(research);
    const execPlan = mapSlidePlanToExecution(slidePlan, { topic: research.topic, slide_count: slidePlan.slides.length });
    this.bus.send("orchestrator", { from: "planner", type: "plan", payload: { research, slidePlan, execPlan } });
  }
}

