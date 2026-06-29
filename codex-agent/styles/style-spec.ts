export interface CardStyle { borderColor: string; headerBg: string; }
export interface StyleSpec {
  titleColor: string; highlightColor: string; fontFamily: string;
  card: CardStyle;
}
export const defaultStyleSpec: StyleSpec = {
  titleColor: "#A80000", highlightColor: "#0070C0", fontFamily: "Arial",
  card: { borderColor: "#D9E2EC", headerBg: "#F0F4F8" },
};
export const techStyleSpec: StyleSpec = {
  titleColor: "#1F4E79", highlightColor: "#2E75B6", fontFamily: "Arial",
  card: { borderColor: "#B4C6E7", headerBg: "#D6E4F0" },
};

