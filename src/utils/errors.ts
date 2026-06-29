export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const ErrorCodes = {
  DECK_NOT_FOUND: "DECK_NOT_FOUND",
  SLIDE_NOT_FOUND: "SLIDE_NOT_FOUND",
  STYLE_NOT_FOUND: "STYLE_NOT_FOUND",
  INVALID_DECK_SCHEMA: "INVALID_DECK_SCHEMA",
  EXPORT_FAILED: "EXPORT_FAILED",
  STORAGE_FAILED: "STORAGE_FAILED",
  INVALID_TOOL_INPUT: "INVALID_TOOL_INPUT",
  DECK_TOO_LARGE: "DECK_TOO_LARGE",
  SLIDE_TYPE_MISMATCH: "SLIDE_TYPE_MISMATCH",
} as const;
