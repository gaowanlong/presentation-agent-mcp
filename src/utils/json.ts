export function safeJsonStringify(obj: unknown, space?: number): string {
  return JSON.stringify(
    obj,
    (key, value) => {
      if (typeof value === "bigint") return value.toString();
      return value;
    },
    space
  );
}

export function safeJsonParse<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}
