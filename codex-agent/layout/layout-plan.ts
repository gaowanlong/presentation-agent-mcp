export type LayoutType = "title" | "two_column" | "four_grid" | "diagram_text" | "challenge_solution_benefit";
export type SlotType = "text" | "diagram" | "bullet" | "metric" | "callout";

export interface SlotDefinition { name: string; type: SlotType; constraint: string; max_length?: number; }
export interface LayoutPlan { slide_id: string; layout_type: LayoutType; slots: SlotDefinition[]; }
export interface FilledSlot { name: string; type: SlotType; content: string; }
export interface FilledSlide { slide_id: string; layout_type: LayoutType; filled_slots: FilledSlot[]; }

export function planHasDiagram(plan: LayoutPlan): boolean { return plan.slots.some(s => s.type === "diagram"); }
export function planHasMetric(plan: LayoutPlan): boolean { return plan.slots.some(s => s.type === "metric"); }
export function planSlotCount(plan: LayoutPlan): number { return plan.slots.length; }

