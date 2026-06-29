import { AgentState } from "../types/agent-state.js";
const TRANSITIONS: Record<AgentState, AgentState[]> = {
  "INIT": ["PARSED", "EXECUTING"], "PARSED": ["PLANNED"], "PLANNED": ["EXECUTING"],
  "EXECUTING": ["REVIEWING", "FIXING", "EXPORTING", "DONE", "FAILED"],
  "REVIEWING": ["FIXING", "EXPORTING", "FAILED"],
  "FIXING": ["REVIEWING", "FAILED"],
  "EXPORTING": ["DONE", "FAILED"],
  "DONE": [], "FAILED": [],
};
export class StateMachine {
  private state: AgentState = "INIT";
  private history: AgentState[] = ["INIT"];
  getState(): AgentState { return this.state; }
  canTransition(to: AgentState): boolean {
    return TRANSITIONS[this.state]?.includes(to) ?? false;
  }
  transition(to: AgentState): void {
    if (!this.canTransition(to)) throw new Error("Invalid transition: " + this.state + " -> " + to);
    this.state = to; this.history.push(to);
  }
  getHistory(): AgentState[] { return [...this.history]; }
  reset() { this.state = "INIT"; this.history = ["INIT"]; }
}

