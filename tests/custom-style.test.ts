import { describe, expect, it } from "vitest";
import { getStyleById } from "../src/styles/index.js";
describe("allen_huawei_tech style", () => {
  const style = getStyleById("allen_huawei_tech");
  it("uses Microsoft YaHei", () => expect(style.typography.font_face).toBe("Microsoft YaHei"));
  it("has cover_title_size", () => expect(style.typography.cover_title_size).toBe(36));
  it("has title_size 24", () => expect(style.typography.title_size).toBe(24));
  it("has min_body_size 12", () => expect(style.typography.min_body_size).toBe(12));
  it("has emphasis color", () => expect(style.colors.emphasis).toBe("0000FF"));
  it("has card_border", () => expect(style.colors.card_border).toBe("D9D9D9"));
  it("has card_title_background", () => expect(style.colors.card_title_background).toBe("CCECFF"));
  it("uses white background", () => expect(style.colors.background).toBe("FFFFFF"));
});
