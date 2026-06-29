import { ResearchContext } from "../types/research.js";

export function parseDeepResearch(text: string): ResearchContext {
  const map: Record<string, string> = { "背景": "background", "background": "background", "insights": "insights", "洞察": "insights", "architecture": "architecture", "架构": "architecture", "roadmap": "roadmap", "路线图": "roadmap", "summary": "summary", "总结": "summary", "implications": "implications", "启示": "implications" };
  const sections: Record<string, string[]> = {};
  let cur = "background";
  const lines = text.split("\n");
  for (const line of lines) {
    const h = line.match(/^##\s+(.+)/);
    if (h) { cur = map[h[1].toLowerCase().trim()] || h[1].toLowerCase(); if (!sections[cur]) sections[cur] = []; continue; }
    const t = line.trim();
    if (t && !t.startsWith("#")) { if (!sections[cur]) sections[cur] = []; sections[cur].push(t); }
  }
  const title = text.split("\n")[0]?.replace(/^#+\s*/, "").trim() || text.substring(0, 60);
  return { topic: title, sections: { background: sections.background || [], insights: sections.insights || [], architecture: (sections.architecture || []).join("\n"), roadmap: (sections.roadmap || []).join("\n"), implications: sections.implications || [] } };
}