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
    title_size: 28,
    subtitle_size: 18,
    body_size: 16,
    caption_size: 11,
  },

  colors: {
    background: "FFFFFF",
    primary: "1F4E79",
    secondary: "2E75B6",
    accent: "4472C4",
    text: "333333",
    muted_text: "888888",
    border: "D9E2EC",
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
