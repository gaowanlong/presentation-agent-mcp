export type MCPToolSpec = {
  name: string; description: string;
  input_schema: any; output_schema: any;
  side_effect: "pure" | "stateful";
  recommended_next?: string[];
};
const registry = new Map<string, MCPToolSpec>();
export function registerTool(spec: MCPToolSpec) { registry.set(spec.name, spec); }
export function getTool(name: string): MCPToolSpec {
  const t = registry.get(name); if (!t) throw new Error("Unknown tool: " + name); return t;
}
export function validateTool(name: string): boolean { return registry.has(name); }
// Register default tools
registerTool({ name: "create_deck", description: "Create a deck", input_schema: {}, output_schema: {}, side_effect: "stateful", recommended_next: ["review_deck"] });
registerTool({ name: "review_deck", description: "Review deck quality", input_schema: {}, output_schema: {}, side_effect: "pure", recommended_next: ["auto_fix_deck", "export_pptx"] });
registerTool({ name: "auto_fix_deck", description: "Auto-fix issues", input_schema: {}, output_schema: {}, side_effect: "stateful", recommended_next: ["review_deck"] });
registerTool({ name: "update_slide", description: "Edit a slide", input_schema: {}, output_schema: {}, side_effect: "stateful", recommended_next: ["review_deck"] });
registerTool({ name: "export_pptx", description: "Export PPTX", input_schema: {}, output_schema: {}, side_effect: "pure", recommended_next: [] });

