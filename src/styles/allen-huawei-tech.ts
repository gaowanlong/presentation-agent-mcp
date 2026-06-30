import { StyleProfile } from "../schema/style.schema.js";

export const allenHuaweiTechStyle: StyleProfile = {
  style_id: "allen_huawei_tech",
  name: "Allen Huawei Tech",
  description:
    "面向技术战略、架构演进、内核机制、AgentOS 等主题的企业技术汇报风格。",

  canvas: {
    width: 13.333,
    height: 7.5,
    unit: "inch",
  },

  typography: {
    font_face: "Microsoft YaHei",
    cover_title_size: 36,
    title_size: 24,
    subtitle_size: 18,
    body_size: 14,
    min_body_size: 12,
    caption_size: 12,
  },

  colors: {
    background: "FFFFFF",
    primary: "A80000",
    secondary: "1F4E79",
    accent: "0070C0",
    emphasis: "0000FF",
    text: "1F2937",
    muted_text: "6B7280",
    border: "D9D9D9",
    card_border: "D9D9D9",
    card_title_background: "CCECFF",
    card_title_text: "1F2937",
    card_background: "FFFFFF",
  },

  rules: {
    title_max_chars_zh: 24,
    max_bullets_per_slide: 5,
    prefer_diagram_over_dense_text: true,
    one_slide_one_message: true,
    max_body_chars_per_slide: 220,
  },
};
