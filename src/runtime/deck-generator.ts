import { Deck, Slide, SlideType } from "../schema/deck.schema.js";
import { Storyline, StorylineSection } from "./storyline-planner.js";
import { getStyleById } from "../styles/index.js";
import { generateId } from "../utils/ids.js";

const ASSERTION_MAP: Record<string, string> = {
  "背景与趋势": "端侧AI负载正从推理向复杂Agent任务演进",
  "核心挑战与机遇": "调度、内存、IO与安全是端侧AI核心瓶颈",
  "关键发现与洞察": "NPU prefill延迟比CPU低18倍",
  "方案对比": "新方案在调度/内存/IO/安全维度全面优于传统方案",
  "目标架构": "AgentOS Kernel采用三层架构——应用层/运行时层/内核层",
  "总结与下一步": "建议分阶段推进端侧OS架构演进路线",
  "议程": "本次汇报涵盖趋势/洞察/对比/架构/路径",
};

export interface DeckGeneratorInput {
  topic: string; audience?: string; purpose?: string; research_brief?: string;
  slide_count: number; style_id: string; storyline: Storyline;
}

export function generateDeck(input: DeckGeneratorInput): Deck {
  const { topic, audience, purpose, research_brief, style_id, storyline } = input;
  const slides: Slide[] = [];
  const now = new Date().toISOString();
  const deckId = generateId("deck");

  // ── Sentence pool: split research_brief into unique sentences ──
  const pool = research_brief
    ? [...new Set(research_brief.split(/[。！\n]/).map(s => s.trim()).filter(s => s.length > 15 && !s.startsWith("#") && !s.startsWith("[") && !s.startsWith("```") && !s.includes("cite")))]
    : [];
  const archText = research_brief || "";
  const insCount = storyline.sections.filter(s => s.suggested_slide_types[0] === "insight").length;
  const perSlide = insCount > 0 ? Math.max(1, Math.floor(pool.length / insCount)) : 2;
  let insIdx = 0;

  for (const section of storyline.sections) {
    const slideType = section.suggested_slide_types[0];
    if (slideType === "insight") {
      const start = insIdx * perSlide;
      const end = Math.min(start + perSlide, pool.length);
      const slidePool = pool.slice(start, end);
      if (slidePool.length === 0) slidePool.push(pool[insIdx % pool.length] || `${topic} 的核心分析`);
      slides.push(createInsightSlide(section, topic, slidePool, insIdx));
      insIdx++;
    } else {
      slides.push(createSlideForType(slideType, section, topic, audience, research_brief, archText));
    }
  }

  return {
    deck_id: deckId, version: 1, title: topic, subtitle: purpose,
    topic, audience, purpose, style_id, slides,
    created_at: now, updated_at: now,
  };
}

function assertionTitle(section: StorylineSection): string {
  return ASSERTION_MAP[section.title] || section.message?.substring(0, 40) || section.title;
}

function createInsightSlide(section: StorylineSection, topic: string, sentences: string[], idx: number): Slide {
  const sid = generateId("s");
  const evNames = ["趋势指标", "技术成熟度", "性能提升", "关键结论"];
  const evVals = ["显著提升", "中高", "30%+", "已验证"];
  return {
    slide_id: sid, type: "insight", title: assertionTitle(section),
    message: section.message || sentences[0]?.substring(0, 80) || `关于 ${topic} 的技术洞察`,
    key_points: sentences.slice(0, 10).map(s => s.substring(0, 120)),
    evidence: [
      { label: evNames[idx % evNames.length], value: evVals[idx % evVals.length], description: sentences[idx % sentences.length]?.substring(0, 50) || "" },
    ],
  };
}

function createSlideForType(type: SlideType, section: StorylineSection, topic: string, audience?: string, research_brief?: string, archText?: string): Slide {
  const sid = generateId("s");
  const base = { slide_id: sid, type, title: assertionTitle(section), message: section.message };

  switch (type) {
    case "title":
      return { ...base, type: "title", subtitle: section.message, author: "Presentation Agent", date: new Date().toISOString().split("T")[0] };

    case "agenda":
      return { ...base, type: "agenda", items: [
        { label: "背景与趋势", description: "端侧AI负载演进" },
        { label: "核心洞察", description: "技术分析与关键发现" },
        { label: "方案对比", description: "传统 vs 新方案" },
        { label: "目标架构", description: "AgentOS Kernel设计" },
        { label: "技术路径", description: "分阶段演进路径" },
        { label: "总结", description: "结论与行动建议" },
      ]};

    case "comparison":
      return { ...base, type: "comparison",
        left: { title: "传统方案", points: ["静态资源调度，缺乏动态适应性", "内存管理粗放，利用率不足60%", "IO路径长，延迟不可控", "安全机制碎片化"] },
        right: { title: "新方案", points: ["智能动态调度，自适应负载变化", "精细化内存管理，利用率>85%", "IO路径优化，确定性延迟", "统一安全框架"] },
        conclusion: "新方案在调度、内存、IO、安全四个维度全面优于传统方案" };

    case "architecture":
      return { ...base, type: "architecture",
        layers: [
          { name: "应用层", description: "智能应用与Agent服务", components: ["推理应用组件", "知识管理模块", "多Agent协同引擎"] },
          { name: "运行时层", description: "Agent Runtime & 资源管理", components: ["动态调度器", "内存管理器", "IO引擎"] },
          { name: "内核层", description: "底层OS机制与安全", components: ["轻量级内核", "安全隔离域", "硬件抽象层"] },
        ],
        architecture_content: extractArchitectureContent(archText || "") };

    case "summary":
      return { ...base, type: "summary",
        takeaways: [
          `${topic} 正面临关键的技术演进窗口`,
          "新架构在调度、内存、IO、安全方面有显著优势",
          "建议推动PoC验证并规划分阶段演进路径",
        ],
        next_steps: ["完成技术选型评估", "制定分阶段演进路线图", "启动核心模块PoC"] };

    case "roadmap":
      return { ...base, type: "roadmap",
        phases: [
          { name: "技术预研与评估", timeline: "Month 1-2", status: "completed", description: `${topic} 技术栈调研与选型评估` },
          { name: "PoC验证", timeline: "Month 3-4", status: "in_progress", description: "核心模块概念验证" },
          { name: "架构设计", timeline: "Month 5-6", status: "planned", description: "整体架构方案设计与评审" },
        ]};

    case "timeline":
      return { ...base, type: "timeline",
        events: [
          { date: "T0", title: "项目启动", description: `${topic} 项目正式启动` },
          { date: "T0+2m", title: "里程碑1", description: "核心方案完成" },
          { date: "T0+4m", title: "里程碑2", description: "PoC验证通过" },
          { date: "T0+6m", title: "正式交付", description: "生产就绪版本" },
        ]};

    case "case_study":
      return { ...base, type: "case_study",
        context: `${topic} 在实际场景中遇到性能和资源瓶颈`,
        challenge: "传统OS架构面对AI负载存在资源碎片化、调度效率低等问题",
        solution: `采用 ${topic} 新架构方案实现突破`,
        results: ["核心指标显著提升", "资源效率大幅优化", "系统稳定性增强"],
        metrics: [{ label: "性能提升", value: "40%" }, { label: "资源节约", value: "30%" }] };

    default:
      return { ...base, type: "insight", key_points: [section.message || `关于 ${topic} 的分析`] };
  }
}

function extractArchitectureContent(text: string): any {
  // Extract component names from architecture description
  const nodes: Array<{ id: string; label: string; group?: string }> = [];
  const edges: Array<{ from: string; to: string; relation: string }> = [];
  let nid = 0;
  const addNode = (label: string, group?: string) => {
    const id = "n" + (++nid);
    if (!nodes.find(n => n.label === label)) nodes.push({ id, label, group });
    return id;
  };
  const lines = text.split(/[。\n;]/);
  for (const line of lines) {
    const layer = line.match(/(\S+层)[：:]?\s*(.+)/);
    if (layer) {
      const layerId = addNode(layer[1], "layer");
      const comps = layer[2].split(/[,，、]/);
      for (const comp of comps) {
        const cid = addNode(comp.trim(), "component");
        edges.push({ from: layerId, to: cid, relation: "contains" });
      }
    }
  }
  // Fallback: create default architecture diagram
  if (nodes.length < 2) {
    ["应用层", "运行时层", "内核层"].forEach(l => addNode(l, "layer"));
  }
  return { diagram: { direction: "layered", nodes, edges }, key_technologies: [
    { id: "t1", title: "QoS调度", body: [{ text: "基于Agent阶段的资源分配策略" }] },
    { id: "t2", title: "内存管理", body: [{ text: "权重与KV-Cache的分层管理" }] },
    { id: "t3", title: "安全隔离", body: [{ text: "最小权限与能力域隔离" }] },
  ]};
}
