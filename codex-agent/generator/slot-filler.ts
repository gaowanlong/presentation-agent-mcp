import { LayoutPlan, FilledSlide, FilledSlot } from "../layout/layout-plan.js";
import { ResearchContext } from "../types/research.js";

export class SlotFiller {
  fill(plans: LayoutPlan[], research: ResearchContext): FilledSlide[] {
    return plans.map(plan => ({
      slide_id: plan.slide_id,
      layout_type: plan.layout_type,
      filled_slots: plan.slots.map(slot => ({
        name: slot.name,
        type: slot.type,
        content: this.fillSlot(slot, research),
      })),
    }));
  }

  private fillSlot(slot: { name: string; type: string; constraint: string; max_length?: number }, research: ResearchContext): string {
    const name = slot.name;
    const findings = research.sections.insights;
    const implications = research.sections.implications;

    // Name-based content generation
    if (name === "title_text") return research.topic;
    if (name === "subtitle") return research.sections.architecture.substring(0, 80) || "Technical report";
    if (name === "section_list") return findings.length + " key sections";
    if (name === "overview") return implications[0] || "Overview of findings";
    if (name === "challenge") return findings[0] || research.sections.background[0] || "Key challenge identified";
    if (name === "trend") return findings[1] || findings[0] || "Industry trend";
    if (name === "data_point") return research.sections.insights.slice(0, 2).join("; ") || "Data point";
    if (name === "implication") return implications[0] || "Key implication";
    if (name === "left_column") return "Traditional approach limitations";
    if (name === "right_column") return "New approach advantages";
    if (name === "conclusion") return "Shift to new approach recommended";
    if (name === "solution") return research.sections.architecture.substring(0, 80) || "Solution approach";
    if (name === "diagram_hint" || name === "diagram") return research.sections.architecture.substring(0, 60) || "Architecture diagram";
    if (name === "benefit") return (research.sections.insights.slice(-1)[0] || "Measurable benefit").substring(0, 60);
    if (name === "finding") return findings[0] || "Key finding";
    if (name === "evidence") return research.sections.insights[0]?.substring(0, 60) || "Supporting evidence";
    if (name === "analysis") return research.sections.background[0]?.substring(0, 80) || "Analysis";
    if (name === "takeaway") return implications[0]?.substring(0, 60) || "Key takeaway";
    if (name === "key_mechanism") return research.sections.architecture.substring(0, 100) || "Core mechanism";
    if (name === "tradeoff") return "Balance between flexibility and performance";
    if (name === "next_steps") return implications[0]?.substring(0, 60) || "Next step";

    // Fallback
    const allText = [...findings, ...implications, research.sections.architecture].filter(Boolean);
    return allText[0]?.substring(0, 80) || "Content";
  }
}

