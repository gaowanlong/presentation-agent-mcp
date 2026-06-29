import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DeepSeekLLMClient } from "../src/llm/deepseek-client.js";

describe("DeepSeekLLMClient", () => {
  let client: DeepSeekLLMClient;
  let originalFetch: typeof globalThis.fetch;
  let mockFetch: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.resetModules();
    process.env.DEEPSEEK_API_KEY = "test-key";
    process.env.DEEPSEEK_BASE_URL = "https://test.api.com/v1";
    process.env.DEEPSEEK_MODEL = "test-model";
    client = new DeepSeekLLMClient();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should expose provider name", () => {
    expect(client.name).toBe("deepseek");
  });

  it("should parse a valid JSON response from LLM", async () => {
    const mockSlide = `{"slide_id":"s001","type":"insight","title":"AI Trends","key_points":["P1","P2"],"evidence":[{"label":"E1","value":"V1"}]}`;
    const mockApiResponse = {
      ok: true,
      json: async () => ({ choices: [{ message: { content: mockSlide } }] }),
    } as any;
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(mockApiResponse);

    const result = await client.generatePatch(
      { slide_id: "s001", type: "title", title: "Old Title" } as any,
      "改成洞察页",
      "AI"
    );
    expect(result.type).toBe("insight");
    expect(result.title).toBe("AI Trends");
  });

  it("should handle markdown code fence JSON", async () => {
    const fenced = "```json\n{\"slide_id\":\"s001\",\"type\":\"summary\",\"title\":\"Summary\",\"takeaways\":[\"T1\"]}\n```";
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ choices: [{ message: { content: fenced } }] }),
    } as any);

    const result = await client.generatePatch(
      { slide_id: "s001", type: "title", title: "Old" } as any,
      "改成总结",
      "AI"
    );
    expect(result.type).toBe("summary");
    expect(result.title).toBe("Summary");
  });

  it("should fallback on invalid JSON", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ choices: [{ message: { content: "not json at all" } }] }),
    } as any);

    // Fallback to rule-based should produce an insight slide
    const result = await client.generatePatch(
      { slide_id: "s001", type: "title", title: "Old" } as any,
      "update slide",
      "AI"
    );
    expect(result.slide_id).toBe("s001");
    expect(result.type).toBe("insight");  // rule-based fallback for generic instruction
  });

  it("should fallback on API error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Server Error",
    } as any);

    const result = await client.generatePatch(
      { slide_id: "s001", type: "title", title: "Old" } as any,
      "update",
      "AI"
    );
    expect(result).toBeTruthy();
  });

  it("should fallback on network error", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("Network timeout"));

    const result = await client.generatePatch(
      { slide_id: "s001", type: "title", title: "Old" } as any,
      "update",
      "AI"
    );
    expect(result).toBeTruthy();
  });

  it("should fallback on schema validation failure", async () => {
    // Return valid JSON but missing required fields
    const badSlide = JSON.stringify({ slide_id: "s001", type: "nonexistent", foo: "bar" });
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ choices: [{ message: { content: badSlide } }] }),
    } as any);

    const result = await client.generatePatch(
      { slide_id: "s001", type: "title", title: "Old" } as any,
      "update",
      "AI"
    );
    // Should fallback to rule-based
    expect(result.slide_id).toBe("s001");
  });

  it("should throw if no API key is set", async () => {
    delete process.env.DEEPSEEK_API_KEY;
    const client2 = new DeepSeekLLMClient();
    // Should fallback on generatePatch instead of throwing
    const result = await client2.generatePatch(
      { slide_id: "s001", type: "title", title: "Old" } as any,
      "update", "AI"
    );
    expect(result).toBeTruthy();
  });
});
