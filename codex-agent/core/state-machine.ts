import { AgentState } from "../types/agent-state.js";
const T: Record<AgentState, AgentState[]> = {
  "INIT": ["PLANNING"],
  "PLANNING": ["EXECUTING", "FAILED"],
  "EXECUTING": ["REVIEWING", "EXPORTING", "FAILED"],
  "REVIEWING": ["FIXING", "EXPORTING", "REPLANNING", "FAILED"],
  "FIXING": ["EXECUTING", "REPLANNING", "FAILED"],
  "REPLANNING": ["EXECUTING", "FAILED"],
  "EXPORTING": ["DONE", "FAILED"],
  "DONE": [], "FAILED": [],
};
export class StateMachine {
  private state: AgentState = "INIT"; private h: AgentState[] = ["INIT"];
  getState() { return this.state; }
  canTransition(to: AgentState) { return T[this.state]?.includes(to) ?? false; }
  transition(to: AgentState) { if (!this.canTransition(to)) throw new Error("Invalid: " + this.state + " -> " + to); this.state = to; this.h.push(to); }
  getHistory() { return [...this.h]; }
  reset() { this.state = "INIT"; this.h = ["INIT"]; }
}

