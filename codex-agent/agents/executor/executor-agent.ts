import { MessageBus, AgentMessage } from "../../core/message-bus.js";
import type { MCPClient } from "../../mcp/mcp-client.js";

export class ExecutorAgent {
  constructor(private bus: MessageBus, private mcpClient: MCPClient) {}

  async handleMessage(msg: AgentMessage): Promise<void> {
    const { node, context } = msg.payload || {};
    if (!node || !node.tool) { this.bus.send("orchestrator", { from: "executor", type: "error", payload: { error: "No node to execute" } }); return; }
    try {
      const input = { ...node.input };
      if (context?.deck_id && !input.deck_id) input.deck_id = context.deck_id;
      const output = await this.mcpClient.call(node.tool, input);
      if (node.tool === "create_deck" && output?.deck_id) context.deck_id = output.deck_id;
      this.bus.send("orchestrator", { from: "executor", type: "execute", payload: { nodeId: node.id, output, status: "success" } });
    } catch (e: any) {
      this.bus.send("orchestrator", { from: "executor", type: "error", payload: { nodeId: node.id, error: e.message, status: "failed" } });
    }
  }
}

