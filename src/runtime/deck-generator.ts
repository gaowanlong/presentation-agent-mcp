import { Deck, Slide, SlideType } from "../schema/deck.schema.js";
import { Storyline, StorylineSection } from "./storyline-planner.js";
import { getStyleById } from "../styles/index.js";
import { generateId } from "../utils/ids.js";

export interface DeckGeneratorInput {
  topic: string; audience?: string; purpose?: string; research_brief?: string;
  slide_count: number; style_id: string; storyline: Storyline;
}

export function generateDeck(input: DeckGeneratorInput): Deck {
  const { topic, audience, purpose, research_brief, style_id, storyline } = input;
  const slides: Slide[] = [];
  const now = new Date().toISOString();
  const deckId = generateId("deck");

  for (const section of storyline.sections) {
    const slideType = section.suggested_slide_types[0];
    const slide = createSlideForType(slideType, section, topic, audience, research_brief);
    slides.push(slide);
  }

  return {
    deck_id: deckId, version: 1, title: topic, subtitle: purpose,
    topic, audience, purpose, style_id, slides,
    created_at: now, updated_at: now,
  };
}

function createSlideForType(type: SlideType, section: StorylineSection, topic: string, audience?: string, research_brief?: string): Slide {
  const slideId = generateId("s");
  const base = { slide_id: slideId, type, title: section.title, message: section.message };

  switch (type) {
    case "title":
      return { ...base, type: "title", subtitle: section.message, author: "Presentation Agent", date: new Date().toISOString().split("T")[0] };

    case "agenda":
      return { ...base, type: "agenda", items: agendaItems() };

    case "insight":
      return { ...base, type: "insight", key_points: insightPoints(section.title, topic, research_brief), evidence: insightEvidence(topic) };

    case "comparison":
      return { ...base, type: "comparison", left: { title: "传统方案", points: ["静态资源调度，缺乏动态适应性", "内存管理粗放，利用率不足 60%", "IO 路径长，延迟不可控", "安全机制碎片化，缺乏统一防护"] }, right: { title: "新方案", points: ["智能动态调度，自适应负载变化", "精细化内存管理，利用率 > 85%", "IO 路径优化，确定性延迟", "统一安全框架，端到端防护"] }, conclusion: "新方案在调度、内存、IO、安全四个维度全面优于传统方案" };

    case "architecture":
      return { ...base, type: "architecture", layers: [{ name: "应用层", description: "智能应用与 Agent 服务", components: ["推理应用", "知识管理", "多Agent协同"] }, { name: "运行时层", description: "Agent Runtime & 资源管理", components: ["动态调度器", "内存管理器", "IO 引擎"] }, { name: "内核层", description: "底层 OS 机制与安全", components: ["轻量级内核", "安全隔离域", "硬件抽象层"] }] };

    case "summary":
      return { ...base, type: "summary", takeaways: [`${topic} 正面临关键的技术演进窗口`, "新架构在调度、内存、IO、安全方面有显著优势", "建议推动 PoC 验证并规划分阶段演进路径"], next_steps: ["完成技术选型评估", "制定分阶段演进路线图", "启动核心模块 PoC"] };

    // V0.2 new types
    case "roadmap":
      return { ...base, type: "roadmap", phases: [{ name: "技术调研与评估", timeline: "Q1 2024", status: "completed" as const, description: `${topic} 相关技术栈调研与选型评估` }, { name: "PoC 验证", timeline: "Q2 2024", status: "in_progress" as const, description: "核心模块概念验证与性能基准测试" }, { name: "架构设计", timeline: "Q3 2024", status: "planned" as const, description: "整体架构方案设计与评审" }, { name: "开发与集成", timeline: "Q4 2024", status: "planned" as const, description: "分阶段开发与系统集成测试" }] };

    case "timeline":
      return { ...base, type: "timeline", events: [{ date: "2023 Q3", title: `${topic} 技术预研启动`, description: "初步技术调研与可行性分析" }, { date: "2024 Q1", title: "关键技术突破", description: "核心算法与架构方案验证" }, { date: "2024 Q2", title: "PoC 版本发布", description: "首个可演示原型系统" }, { date: "2024 Q4", title: "正式版本发布", description: "生产就绪版本交付" }] };

    case "case_study":
      return { ...base, type: "case_study", context: `${topic} 在端侧 AI 场景下遇到性能和资源瓶颈`, challenge: "传统 OS 架构面对 AI 负载存在资源碎片化、调度效率低、安全隔离不足等问题", solution: "采用 AgentOS Kernel 新架构，实现动态调度、精细化内存管理和统一安全框架", results: ["资源利用率提升 30%+", "AI 推理延迟降低 40%", "安全攻击面降低 50%"], metrics: [{ label: "资源利用率", value: "+30%" }, { label: "推理延迟", value: "-40%" }, { label: "攻击面", value: "-50%" }, { label: "TCO", value: "-25%" }] };

    default:
      return { ...base, type: "insight", key_points: insightPoints(section.title, topic, research_brief) };
  }
}

function agendaItems() {
  return [
    { label: "背景与趋势", description: "行业背景与核心挑战" },
    { label: "关键洞察", description: "技术分析与关键发现" },
    { label: "方案对比", description: "传统方案 vs 新方案" },
    { label: "目标架构", description: "整体架构设计" },
    { label: "技术路径", description: "关键技术路径" },
    { label: "总结与下一步", description: "核心结论与行动计划" },
  ];
}

function insightPoints(sectionTitle: string, topic: string, research_brief?: string): string[] {
  if (research_brief) {
    const sentences = research_brief.split(/[。！\n]/).map(s => s.trim()).filter(s => s.length > 10);
    if (sentences.length >= 3) return sentences.slice(0, 4);
  }
  const map: Record<string, string[]> = {
    "背景与趋势": [`端侧 AI 负载正从简单推理向复杂 Agent 任务演进`, `传统 OS 架构面对 AI 负载存在资源碎片化问题`, `行业技术路线正在向 Agent-oriented 方向迁移`, `${topic} 是下一代终端的核心基础设施`],
    "核心挑战与机遇": [`AI 负载对 OS 的资源调度能力提出了全新要求`, `内存和 IO 成为端侧 AI 性能瓶颈`, `安全隔离需求从应用级延伸到模型级`, `行业处于架构演进的关键窗口期`],
    "关键发现与洞察": [`动态调度相比静态调度可提升资源利用率 30%+`, `统一安全框架能降低攻击面 50% 以上`, `Agent 运行时需要全新的 IPC 和内存管理机制`, `现有架构的演进成本远低于重构成本`],
    "数据与事实支撑": [`AI 推理负载年复合增长率超过 60%`, `60% 以上的端侧 AI 场景受限于内存瓶颈`, `确定性 IO 延迟对实时 Agent 任务至关重要`, `行业头部厂商已启动架构演进实践`],
  };
  return map[sectionTitle] || [`${topic} 的关键技术挑战分析`, `现有方案存在明显的架构局限性`, `新方案在关键指标上显著优于传统方案`, `建议优先推进 ${topic} 的技术验证`];
}

function insightEvidence(topic: string) {
  return [{ label: "趋势指标", value: "显著提升", description: `${topic} 相关指标趋势向好` }, { label: "技术成熟度", value: "中高", description: "核心技术已具备落地条件" }];
}
