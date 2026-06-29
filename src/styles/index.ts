import { StyleProfile } from "../schema/style.schema.js";
import { AppError, ErrorCodes } from "../utils/errors.js";
import { defaultStyle } from "./default-style.js";
import { allenHuaweiTechStyle } from "./allen-huawei-tech.js";

const styleRegistry: Record<string, StyleProfile> = {
  default: defaultStyle,
  allen_huawei_tech: allenHuaweiTechStyle,
};

export function getStyleById(styleId: string): StyleProfile {
  const style = styleRegistry[styleId];
  if (!style) {
    throw new AppError(ErrorCodes.STYLE_NOT_FOUND, `Style "${styleId}" not found`);
  }
  return style;
}

export function listStyleIds(): string[] {
  return Object.keys(styleRegistry);
}
