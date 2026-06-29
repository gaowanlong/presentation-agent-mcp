/**
 * JSON repair utilities for LLM output.
 * V0.3: Stubs ready for when real LLM is plugged in.
 */

/** Attempt to repair a malformed JSON string. Returns parsed object or null. */
export function repairJson<T = unknown>(text: string): T | null {
  // Step 1: Try direct parse
  try {
    return JSON.parse(text) as T;
  } catch {
    // Continue to repair
  }

  let cleaned = text;

  // Step 2: Strip markdown code fences
  cleaned = stripCodeFences(cleaned);

  // Step 3: Fix trailing commas in objects and arrays
  cleaned = cleaned.replace(/,\s*}/g, "}");
  cleaned = cleaned.replace(/,\s*\]/g, "]");

  // Step 4: Remove BOM and control characters (except whitespace)
  cleaned = cleaned.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFEFF]/g, "");

  // Step 5: Try parse again
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Return null if still invalid
    return null;
  }
}

/** Strip markdown-style code fences (```json ... ```) */
function stripCodeFences(text: string): string {
  return text.replace(/```(?:json)?\n?/gi, "").trim();
}

/** Check if a string looks like valid JSON (starts with { or [) */
export function looksLikeJson(text: string): boolean {
  const trimmed = text.trim();
  return trimmed.startsWith("{") || trimmed.startsWith("[");
}

/** Try to extract a JSON object from text that may contain explanatory text around it */
export function extractJson(text: string): string | null {
  // Try to find {...} or [...] patterns, handling nested braces
  const trimmed = text.trim();

  for (const delimiter of ["{", "["]) {
    const start = trimmed.indexOf(delimiter);
    if (start === -1) continue;

    const endDelim = delimiter === "{" ? "}" : "]";
    let depth = 0;
    let inString = false;

    for (let i = start; i < trimmed.length; i++) {
      const ch = trimmed[i];
      if (ch === '"' && trimmed[i - 1] !== "\\") inString = !inString;
      if (!inString) {
        if (ch === delimiter) depth++;
        if (ch === endDelim) {
          depth--;
          if (depth === 0) {
            return trimmed.substring(start, i + 1);
          }
        }
      }
    }
  }

  return null;
}
