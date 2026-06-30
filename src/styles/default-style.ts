import { StyleProfile } from "../schema/style.schema.js";

export const defaultStyle: StyleProfile = {
  style_id: "default",
  name: "Default",
  description: "Default clean presentation style.",

  canvas: {
    width: 13.333,
    height: 7.5,
    unit: "inch",
  },

  typography: {
    font_face: "Arial",
    cover_title_size: 36,
    title_size: 28,
    subtitle_size: 18,
    body_size: 16,
    min_body_size: 12,
    caption_size: 11,
  },

  colors: {
    background: "FFFFFF",
    primary: "1F4E79",
    secondary: "2E75B6",
    accent: "4472C4",
    emphasis: "0000FF",
    text: "333333",
    muted_text: "888888",
    border: "D9E2EC",
    card_border: "D9D9D9",
    card_title_background: "CCECFF",
    card_title_text: "1F2937",
    card_background: "F5F7FA",
  },

  rules: {
    title_max_chars_zh: 30,
    max_bullets_per_slide: 6,
    prefer_diagram_over_dense_text: false,
    one_slide_one_message: true,
    max_body_chars_per_slide: 300,
  },
};
