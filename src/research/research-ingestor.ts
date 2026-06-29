import { ResearchArtifact } from "./research-artifact.schema.js";

/**
 * Rule-based ingestion of a research brief text.
 * Uses keyword matching to extract key findings, implications, and data points.
 * V0.4: No real LLM / Deep Research — deterministic extraction only.
 */
export function ingestResearchBrief(
  rawText: string,
  topic?: string
): ResearchArtifact {
  const sections = rawText.split(/##|\n#{1,5}\s*/).map((s) => s.trim()).filter(Boolean);

  // Split into sentences
  const sentences = rawText
    .split(/[。\n！？]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10);

  // Extract key findings
  const keyFindings = findSentences(sentences, [
    "核心", "结论", "发现", "趋势", "瓶颈", "关键", "根本",
    "核心结论", "最重要", "本质", "转折",
  ]);

  // Extract implications
  const implications = findSentences(sentences, [
    "建议", "方向", "应", "需要", "必须", "应当",
    "演进方向", "下一步", "路径", "重构", "未来",
  ]);

  // Extract data points (sentences with numbers/percentages)
  const dataPoints: Array<{ metric: string; value: string; source?: string }> = [];
  const numberPattern = /\d+(?:\.\d+)?\s*(?:%|倍|GiB|x|token|ms|s|TPS)/;
  for (const s of sentences) {
    const match = s.match(numberPattern);
    if (match) {
      const label = s.substring(0, Math.min(20, s.length)).replace(/[：:].*$/, "").trim();
      dataPoints.push({
        metric: label || "指标",
        value: match[0],
        source: s.substring(0, 80),
      });
    }
  }

  // Extract quotes
  const quotes = sentences
    .filter((s) => s.includes("指出") || s.includes("表明") || s.includes("表示") || s.includes("强调"))
    .slice(0, 3);

  return {
    title: extractTitle(rawText, topic),
    key_findings: keyFindings.length > 0 ? keyFindings : [sentences[0] || `${topic || rawText.substring(0, 50)} 相关分析`],
    implications: implications.length > 0 ? implications : [`建议进一步研究 ${topic || "相关领域"} 的技术演进方向`],
    data_points: dataPoints.slice(0, 6),
    quotes: quotes.length > 0 ? quotes : undefined,
    raw_text: rawText.substring(0, 5000),
  };
}

function findSentences(sentences: string[], keywords: string[]): string[] {
  const found: string[] = [];
  for (const s of sentences) {
    if (keywords.some((k) => s.includes(k))) {
      found.push(s.trim());
      if (found.length >= 6) break;
    }
  }
  return found;
}

function extractTitle(rawText: string, topic?: string): string {
  // First line of the document, or first heading
  const lines = rawText.split("\n").map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    if (line.startsWith("#")) return line.replace(/^#+\s*/, "");
  }
  return topic || lines[0] || "Research Report";
}
