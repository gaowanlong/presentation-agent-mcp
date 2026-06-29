import { describe, expect, it } from "vitest";
import { ProviderRegistry } from "../src/llm/provider-registry.js";
import { AppError, ErrorCodes } from "../src/utils/errors.js";

describe("ProviderRegistry", () => {
  it("rejects missing provider configuration", async () => {
    const registry = new ProviderRegistry();
    await expect(registry.resolve("")).rejects.toMatchObject({
      code: ErrorCodes.PROVIDER_NOT_CONFIGURED,
    });
  });

  it("rejects an unknown provider", async () => {
    const registry = new ProviderRegistry();
    await expect(registry.resolve("unknown")).rejects.toMatchObject({
      code: ErrorCodes.PROVIDER_NOT_FOUND,
    });
  });

  it("returns a registered provider after validation", async () => {
    let validated = false;
    const provider = {
      id: "test",
      name: "test",
      validateConfiguration: async () => { validated = true; },
      generateStoryline: async () => { throw new Error("unused"); },
      generateDeck: async () => { throw new Error("unused"); },
      generatePatch: async () => { throw new Error("unused"); },
    };
    const registry = new ProviderRegistry().register("test", () => provider);
    const resolved = await registry.resolve("test");
    expect(resolved).toBe(provider);
    expect(validated).toBe(true);
  });
});

