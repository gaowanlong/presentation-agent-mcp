export type AgentType = "orchestrator" | "planner" | "executor" | "reviewer" | "fixer";
export type AgentMessageType = "plan" | "execute" | "review" | "fix" | "replan" | "done" | "error";
export interface AgentMessage { from: AgentType; to: AgentType; type: AgentMessageType; payload: any; timestamp: number; }

export class MessageBus {
  private queues = new Map<string, AgentMessage[]>();
  private history: AgentMessage[] = [];

  send(to: AgentType, msg: Omit<AgentMessage, "to" | "timestamp">) {
    const full: AgentMessage = { ...msg, to, timestamp: Date.now() };
    const key = to;
    if (!this.queues.has(key)) this.queues.set(key, []);
    this.queues.get(key)!.push(full);
    this.history.push(full);
  }

  receive(agent: AgentType): AgentMessage | null {
    const q = this.queues.get(agent);
    if (!q || q.length === 0) return null;
    return q.shift()!;
  }

  broadcast(type: AgentMessageType, payload: any) {
    const agents: AgentType[] = ["orchestrator", "planner", "executor", "reviewer", "fixer"];
    for (const a of agents) this.send(a, { from: "orchestrator", type, payload });
  }

  getHistory(): AgentMessage[] { return [...this.history]; }
  pendingCount(agent: AgentType): number { return (this.queues.get(agent) || []).length; }
}

