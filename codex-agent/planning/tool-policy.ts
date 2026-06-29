export class ToolPolicy {
  selectTool(slideType: string): string {
    if (slideType === "architecture" || slideType === "roadmap") return "update_slide";
    return "create_deck";
  }
  shouldAutoFix(reviewScore: number): boolean { return reviewScore < 75; }
  shouldUpdateSlide(slideType: string): boolean { return ["architecture", "roadmap", "summary"].includes(slideType); }
}

