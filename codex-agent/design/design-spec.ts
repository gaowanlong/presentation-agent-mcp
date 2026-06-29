export interface TypographySpec { titleSize: number; bodySize: number; fontFamily: string; titleColor: string; emphasisColor: string; }
export interface SpacingSpec { margin: number; padding: number; lineHeight: number; sectionGap: number; }
export interface HierarchySpec { titleWeight: string; sectionWeight: string; bodyWeight: string; }
export interface AlignmentSpec { titleAlign: string; bodyAlign: string; }
export interface VisualBalanceSpec { maxDensity: number; minWhitespace: number; maxFocalPoints: number; }
export interface DesignSpec { typography: TypographySpec; spacing: SpacingSpec; hierarchy: HierarchySpec; alignment: AlignmentSpec; visual_balance: VisualBalanceSpec; }

export const defaultDesignSpec: DesignSpec = {
  typography: { titleSize: 28, bodySize: 16, fontFamily: "Arial", titleColor: "#A80000", emphasisColor: "#0070C0" },
  spacing: { margin: 0.5, padding: 0.15, lineHeight: 1.3, sectionGap: 0.25 },
  hierarchy: { titleWeight: "bold", sectionWeight: "medium", bodyWeight: "normal" },
  alignment: { titleAlign: "left", bodyAlign: "left" },
  visual_balance: { maxDensity: 0.6, minWhitespace: 0.15, maxFocalPoints: 2 },
};

export const techDesignSpec: DesignSpec = {
  typography: { titleSize: 28, bodySize: 15, fontFamily: "Arial", titleColor: "#1F4E79", emphasisColor: "#2E75B6" },
  spacing: { margin: 0.6, padding: 0.2, lineHeight: 1.4, sectionGap: 0.3 },
  hierarchy: { titleWeight: "bold", sectionWeight: "medium", bodyWeight: "normal" },
  alignment: { titleAlign: "left", bodyAlign: "left" },
  visual_balance: { maxDensity: 0.55, minWhitespace: 0.2, maxFocalPoints: 2 },
};

