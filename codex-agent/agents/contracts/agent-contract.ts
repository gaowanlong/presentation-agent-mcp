import { AgentType } from "../../core/semantic-message.js";
export interface AgentContract {
  agent: AgentType;
  description: string;
  allowed_intents: string[];
  forbidden_actions: string[];
  input_fields: string[];
  output_fields: string[];
}

