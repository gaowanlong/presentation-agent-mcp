import { MessageBus, SemanticMessage, createMessage } from "../../core/message-bus.js";
import { parseDeepResearch } from "../../planning/deepresearch-parser.js";
import { SlidePlanner } from "../../planning/slide-planner.js";
import { mapSlidePlanToExecution } from "../../planning/plan-mapper.js";
import { ContractRegistry } from "../contracts/contract-registry.js";

export class PlannerAgent {
  constructor(private bus: MessageBus, private contracts: ContractRegistry) {}

  async handleMessage(msg: SemanticMessage): Promise<void> {
    const text = msg.context.artifacts?.text || "";
    if (!text) { this.bus.send(createMessage("planner", "orchestrator", "build_slide_plan", "Plan failed", { priority: "high" })); return; }
    const research = parseDeepResearch(text);
    const slidePlan = new SlidePlanner().plan(research);
    const execPlan = mapSlidePlanToExecution(slidePlan, { topic: research.topic, slide_count: slidePlan.slides.length });
    const intents: Record<string, string> = {};
    for (const s of slidePlan.slides) {
      if (s.type === "architecture") intents[s.id] = "build_system_view";
      else if (s.type === "roadmap") intents[s.id] = "show_evolution_path";
      else if (s.type === "comparison") intents[s.id] = "highlight_tradeoffs";
      else intents[s.id] = s.type + "_slide";
    }
    this.bus.send(createMessage("planner", "orchestrator", "build_slide_plan", "Slide plan generated", { artifacts: { research, slidePlan, execPlan, intents }, expected_outcome: "Plan ready for execution" }));
  }
}

