import { Deck } from "../schema/deck.schema.js";
import { LayoutedDeck, LayoutedSlide, LayoutElement } from "../schema/layout.schema.js";
import { StyleProfile } from "../schema/style.schema.js";
import { getStyleById } from "../styles/index.js";
import { buildPageNumber } from "./layout-utils.js";
import { layoutTitleSlide } from "./layouts/title.layout.js";
import { layoutAgendaSlide } from "./layouts/agenda.layout.js";
import { layoutInsightSlide } from "./layouts/insight.layout.js";
import { layoutComparisonSlide } from "./layouts/comparison.layout.js";
import { layoutArchitectureSlide } from "./layouts/architecture.layout.js";
import { layoutSummarySlide } from "./layouts/summary.layout.js";
import { layoutRoadmapSlide } from "./layouts/roadmap.layout.js";
import { layoutTimelineSlide } from "./layouts/timeline.layout.js";
import { layoutCaseStudySlide } from "./layouts/case-study.layout.js";

export class LayoutEngine {
  layout(deck: Deck): LayoutedDeck {
    const style = getStyleById(deck.style_id);
    const totalSlides = deck.slides.length;
    const layoutedSlides: LayoutedSlide[] = deck.slides.map((slide, idx) => {
      const elements = this.layoutSlide(slide, style);
      elements.push(buildPageNumber(style, idx + 1, totalSlides));
      return { slide_id: slide.slide_id, type: slide.type, elements };
    });
    return { deck_id: deck.deck_id, style_id: deck.style_id, slides: layoutedSlides };
  }

  layoutSlide(slide: any, style: StyleProfile): LayoutElement[] {
    switch (slide.type) {
      case "title": return layoutTitleSlide(slide, style);
      case "agenda": return layoutAgendaSlide(slide, style);
      case "insight": return layoutInsightSlide(slide, style);
      case "comparison": return layoutComparisonSlide(slide, style);
      case "architecture": return layoutArchitectureSlide(slide, style);
      case "summary": return layoutSummarySlide(slide, style);
      case "roadmap": return layoutRoadmapSlide(slide, style);
      case "timeline": return layoutTimelineSlide(slide, style);
      case "case_study": return layoutCaseStudySlide(slide, style);
      default: return layoutInsightSlide(slide, style);
    }
  }
}
