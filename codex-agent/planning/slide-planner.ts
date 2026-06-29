import { ResearchContext } from "../types/research.js";
import { SlidePlan } from "../types/slide-plan.js";
let sid = 0;
function nid() { return "s" + String(++sid).padStart(3,"0"); }
export class SlidePlanner {
  plan(r: ResearchContext): SlidePlan {
    sid = 0; const slides = [];
    slides.push({ id: nid(), type: "title", source: "topic", intent: "Intro" });
    slides.push({ id: nid(), type: "agenda", source: "auto", intent: "Agenda" });
    (r.sections.background || []).forEach(b => slides.push({ id: nid(), type: "insight", source: "background", intent: b.substring(0,60) }));
    (r.sections.insights || []).forEach(x => slides.push({ id: nid(), type: "insight", source: "insights", intent: x.substring(0,60) }));
    if (r.sections.architecture) slides.push({ id: nid(), type: "architecture", source: "architecture", intent: "Architecture" });
    if (r.sections.roadmap) slides.push({ id: nid(), type: "roadmap", source: "roadmap", intent: "Roadmap" });
    slides.push({ id: nid(), type: "summary", source: "auto", intent: "Summary" });
    return { slides };
  }
}