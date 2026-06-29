import { Slide, ComparisonSlide, ArchitectureSlide, InsightSlide, RoadmapSlide, TimelineSlide, CaseStudySlide } from "../schema/deck.schema.js";
import { generateStoryline as builtinGenerateStoryline, Storyline, StorylineInput } from "../runtime/storyline-planner.js";
import { DeckGeneratorInput } from "./llm-client.js";
import { generateDeck as builtinGenerateDeck } from "../runtime/deck-generator.js";
import { Deck } from "../schema/deck.schema.js";
import { LLMClient } from "./llm-client.js";

export class RuleBasedLLMClient implements LLMClient {
  readonly id = "rule-based";
  readonly name = "rule-based";

  async validateConfiguration(): Promise<void> {}

  async generateStoryline(input: StorylineInput): Promise<Storyline> {
    return builtinGenerateStoryline(input);
  }

  async generateDeck(input: DeckGeneratorInput): Promise<Deck> {
    return builtinGenerateDeck(input);
  }

  async generatePatch(slide: Slide, instruction: string, topic: string): Promise<Slide> {
    const inst = instruction.toLowerCase();
    const sid = slide.slide_id;

    if (this.mentions(inst, "对比", "vs", "versus", "compar", "difference"))
      return this.makeComparisonSlide(sid, inst, topic);
    if (this.mentions(inst, "架构", "layer", "architect", "分层"))
      return this.makeArchitectureSlide(sid, inst);
    if (this.mentions(inst, "路线图", "roadmap", "road map", "演进路径", "milestone"))
      return this.makeRoadmapSlide(sid, topic);
    if (this.mentions(inst, "时间线", "timeline", "time line", "历史", "历程"))
      return this.makeTimelineSlide(sid, topic);
    if (this.mentions(inst, "案例", "case", "case_study", "实践", "实践案例"))
      return this.makeCaseStudySlide(sid, topic, inst);
    return this.makeInsightSlide(sid, inst, topic);
  }

  private mentions(text: string, ...keywords: string[]): boolean {
    return keywords.some((k) => text.includes(k));
  }

  private makeComparisonSlide(sid: string, inst: string, topic: string): ComparisonSlide {
    const dims = this.extractDimensions(inst, ["调度", "内存", "IO", "安全"]);
    return { slide_id: sid, type: "comparison", title: "方案对比", message: "传统方案与新方案的关键差异",
      left: { title: "传统方案", points: dims.map((d) => `传统 ${d}：静态配置，缺乏动态适应`) },
      right: { title: "新方案", points: dims.map((d) => `新 ${d}：智能动态，自适应优化`) },
      conclusion: `新方案在${dims.join("、")}维度全面优于传统方案` };
  }

  private makeArchitectureSlide(sid: string, inst: string): ArchitectureSlide {
    const layers = this.parseLayers(inst);
    return { slide_id: sid, type: "architecture", title: "目标架构",
      layers: layers.map((n) => ({ name: n, components: [`${n} 组件 A`, `${n} 组件 B`, `${n} 组件 C`] })) };
  }

  private makeRoadmapSlide(sid: string, topic: string): RoadmapSlide {
    return { slide_id: sid, type: "roadmap", title: "演进路线图",
      phases: [
        { name: "技术预研", timeline: "Month 1-2", status: "completed", description: `${topic} 技术栈调研` },
        { name: "PoC 验证", timeline: "Month 3-4", status: "in_progress", description: "核心能力验证" },
        { name: "正式开发", timeline: "Month 5-8", status: "planned", description: "分阶段开发交付" },
      ] };
  }

  private makeTimelineSlide(sid: string, topic: string): TimelineSlide {
    return { slide_id: sid, type: "timeline", title: "项目时间线",
      events: [
        { date: "T0", title: "项目启动", description: `${topic} 项目正式启动` },
        { date: "T0+2m", title: "里程碑 1", description: "核心方案完成" },
        { date: "T0+4m", title: "里程碑 2", description: "PoC 验证通过" },
        { date: "T0+6m", title: "正式交付", description: "生产就绪版本" },
      ] };
  }

  private makeCaseStudySlide(sid: string, topic: string, inst: string): CaseStudySlide {
    return { slide_id: sid, type: "case_study", title: "实践案例",
      context: `${topic} 在实际场景中遇到性能和资源瓶颈`,
      challenge: inst.length > 20 ? inst.substring(0, 100) : `${topic} 面临的技术挑战与约束`,
      solution: `采用 ${topic} 新架构方案实现突破`,
      results: ["核心指标显著提升", "资源效率大幅优化", "系统稳定性增强"],
      metrics: [{ label: "性能提升", value: "40%" }, { label: "资源节约", value: "30%" }] };
  }

  private makeInsightSlide(sid: string, inst: string, topic: string): InsightSlide {
    const topics = inst.replace(/[，。！？、]/g, " ").split(" ").filter((w) => w.length > 1).slice(0, 4);
    const kp = topics.length >= 2
      ? topics.map((t) => `${topic} 在 ${t} 方面的关键分析`)
      : [`${topic} 的技术演进分析`, `核心挑战与应对策略`, `关键指标与趋势判断`, `建议路径与下一步行动`];
    return { slide_id: sid, type: "insight", title: "技术分析", message: inst.substring(0, 100), key_points: kp,
      evidence: [{ label: "分析维度", value: `${topics.length} 个`, description: inst.substring(0, 60) }, { label: "置信度", value: "高", description: "基于确定性规则生成" }] };
  }

  private extractDimensions(inst: string, defaults: string[]): string[] {
    const known = ["调度", "内存", "IO", "安全", "性能", "功耗", "延迟", "吞吐", "可扩展", "可靠性", "成本", "效率"];
    const found = known.filter((d) => inst.includes(d));
    return found.length >= 2 ? found.slice(0, 4) : defaults;
  }

  private parseLayers(inst: string): string[] {
    const m = [...inst.matchAll(/([^\s，,。]+)层/g)];
    if (m.length >= 2) return m.map((x) => x[1] + "层").slice(0, 5);
    const common = ["应用Agent层", "Agent运行时层", "Kernel机制层"];
    const found = common.filter((l) => inst.includes(l.replace("Agent", "").replace("Kernel", "")));
    return found.length >= 2 ? found : ["应用层", "平台层", "内核层"];
  }
}
