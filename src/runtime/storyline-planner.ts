import { SlideType } from "../schema/deck.schema.js";
import { generateId } from "../utils/ids.js";

export interface Storyline {
  storyline_id: string;
  title: string;
  narrative: string;
  sections: StorylineSection[];
}

export interface StorylineSection {
  title: string;
  message: string;
  suggested_slide_types: SlideType[];
}

export interface StorylineInput {
  topic: string;
  audience?: string;
  purpose?: string;
  research_brief?: string;
  slide_count: number;
}

export function generateStoryline(input: StorylineInput): Storyline {
  const { topic, audience, purpose, research_brief, slide_count } = input;

  const count = Math.max(6, Math.min(slide_count, 10));
  const sections = buildSections(topic, audience, purpose, research_brief, count);

  return {
    storyline_id: generateId("storyline"),
    title: topic,
    narrative: purpose
      ? `${topic}：${purpose}`
      : `${topic} 技术汇报`,
    sections,
  };
}

function buildSections(
  topic: string,
  audience?: string,
  purpose?: string,
  research_brief?: string,
  count: number = 8
): StorylineSection[] {
  const sections: StorylineSection[] = [];

  // 1. Title
  sections.push({
    title: topic,
    message: purpose || `深入探讨 ${topic}`,
    suggested_slide_types: ["title"],
  });

  // 2. Agenda
  sections.push({
    title: "议程",
    message: "本次汇报内容概览",
    suggested_slide_types: ["agenda"],
  });

  // 3. Background / insight
  sections.push({
    title: "背景与趋势",
    message: research_brief
      ? research_brief.substring(0, 120)
      : `当前 ${topic} 的核心背景与行业趋势`,
    suggested_slide_types: ["insight"],
  });

  // Content sections: remaining after title, agenda, background, summary
  // count - 4 = number of content sections between background and summary
  const contentCount = count - 4;

  // Comparison first
  sections.push({
    title: "方案对比",
    message: "传统方案与新方案的关键差异",
    suggested_slide_types: ["comparison"],
  });

  // Insight pages for the remaining slots (contentCount - 2 for comparison and architecture)
  const insightCount = Math.max(0, contentCount - 2);
  const insightLabels = [
    "核心挑战与机遇",
    "关键发现与洞察",
    "数据与事实支撑",
    "技术深度分析",
  ];
  for (let i = 0; i < insightCount; i++) {
    sections.push({
      title: insightLabels[i] || `洞察 ${i + 1}`,
      message: `关于 ${topic} 的技术洞察`,
      suggested_slide_types: ["insight"],
    });
  }

  // Architecture
  sections.push({
    title: "目标架构",
    message: `${topic} 的整体架构设计`,
    suggested_slide_types: ["architecture"],
  });

  // Summary
  sections.push({
    title: "总结与下一步",
    message: "核心结论与后续行动计划",
    suggested_slide_types: ["summary"],
  });

  return sections;
}
