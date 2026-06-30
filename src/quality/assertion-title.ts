const GENERIC_SECTION_PATTERNS = [
  /^背景与趋势$/,
  /^关键洞察$/,
  /^目标架构$/,
  /^方案对比$/,
  /^总结与下一步$/,
  /^议程$/,
  /^核心挑战与机遇$/,
  /^关键发现与洞察$/,
  /^数据与事实支撑$/,
  /^技术深度分析$/,
];
export function isAssertionTitle(title: string): boolean {
  return !GENERIC_SECTION_PATTERNS.some(p => p.test(title.trim()));
}
