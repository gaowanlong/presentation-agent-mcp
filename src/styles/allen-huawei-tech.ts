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
    font_face: "Arial",
    title_size: 28,
    subtitle_size: 18,
    body_size: 16,
    caption_size: 11,
  },

  colors: {
    background: "F7F9FC",
    primary: "A80000",
    secondary: "1F4E79",
    accent: "0070C0",
    text: "1F2937",
    muted_text: "6B7280",
    border: "D9E2EC",
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
