import { StyleProfile } from "../schema/style.schema.js";

export function pptxColor(color: string): string {
  // Strip leading # if present and ensure exactly 6 hex characters
  let hex = color.startsWith("#") ? color.substring(1) : color;
  // Remove any alpha/opacity suffix (PptxGenJS only accepts 6-digit RGB)
  hex = hex.substring(0, 6);
  return hex;
}

export function applyAlpha(hexColor: string, alpha: number = 0.15): string {
  // For PptxGenJS, we just use the base color since it doesn't support alpha
  // The alpha/blend effect is achieved by setting the fill opacity separately
  return hexColor;
}
