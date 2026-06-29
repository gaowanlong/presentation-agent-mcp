import { SlideType } from "../schema/deck.schema.js";
import { generateId } from "../utils/ids.js";
import { ingestResearchBrief } from "../research/research-ingestor.js";
import { ResearchArtifact } from "../research/research-artifact.schema.js";

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

  const researchArtifact = research_brief
    ? ingestResearchBrief(research_brief, topic)
    : undefined;

  const count = Math.max(6, Math.min(slide_count, 10));
  const sections = buildSections(topic, audience, purpose, research_brief, count, researchArtifact);

  return {
    storyline_id: generateId("storyline"),
    title: topic,
    narrative: purpose ? `${topic}：${purpose}` : `${topic} 技术汇报`,
    sections,
  };
}

function buildSections(
  topic: string,
  audience?: string,
  purpose?: string,
  research_brief?: string,
  count: number = 8,
  researchArtifact?: ResearchArtifact
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

  // 3. Background / insight (use research artifact if available)
  const bgMessage = researchArtifact
    ? researchArtifact.key_findings.slice(0, 2).join("；") || research_brief?.substring(0, 120) || `当前 ${topic} 的核心背景与行业趋势`
    : research_brief
      ? research_brief.substring(0, 120)
      : `当前 ${topic} 的核心背景与行业趋势`;

  sections.push({
    title: "背景与趋势",
    message: bgMessage,
    suggested_slide_types: ["insight"],
  });

  const contentCount = count - 4;

  // Comparison
  sections.push({
    title: "方案对比",
    message: "传统方案与新方案的关键差异",
    suggested_slide_types: ["comparison"],
  });

  // Insight pages
  const insightCount = Math.max(0, contentCount - 2);
  const insightLabels = ["核心挑战与机遇", "关键发现与洞察", "数据与事实支撑", "技术深度分析"];

  for (let i = 0; i < insightCount; i++) {
    // Use research artifact data for insight messages
    let msg: string;
    if (researchArtifact) {
      const findings = researchArtifact.key_findings;
      const dataPoints = researchArtifact.data_points;
      if (i === 0 && findings.length > 2) msg = findings[2];
      else if (i === 1 && dataPoints.length > 0) msg = `数据支撑：${dataPoints.slice(0, 2).map(d => `${d.metric} ${d.value}`).join("；")}`;
      else msg = `关于 ${topic} 的技术洞察`;
    } else {
      msg = `关于 ${topic} 的技术洞察`;
    }

    sections.push({
      title: insightLabels[i] || `洞察 ${i + 1}`,
      message: msg,
      suggested_slide_types: ["insight"],
    });
  }

  // Architecture
  sections.push({
    title: "目标架构",
    message: `${topic} 的整体架构设计`,
    suggested_slide_types: ["architecture"],
  });

  // Summary (use implications if available)
  const summaryMsg = researchArtifact?.implications.length
    ? `核心结论：${researchArtifact.implications.slice(0, 2).join("；")}`
    : "核心结论与后续行动计划";

  sections.push({
    title: "总结与下一步",
    message: summaryMsg,
    suggested_slide_types: ["summary"],
  });

  return sections;
}
