import type { LLMClient } from "./llm-client.js";
import { AppError, ErrorCodes } from "../utils/errors.js";

type ProviderFactory = () => LLMClient;

export class ProviderRegistry {
  private factories = new Map<string, ProviderFactory>();

  register(id: string, factory: ProviderFactory): this {
    this.factories.set(id, factory);
    return this;
  }

  async resolve(id: string | undefined): Promise<LLMClient> {
    if (!id?.trim()) {
      throw new AppError(
        ErrorCodes.PROVIDER_NOT_CONFIGURED,
        "LLM_PROVIDER environment variable must name a configured production provider"
      );
    }
    const factory = this.factories.get(id);
    if (!factory) {
      throw new AppError(
        ErrorCodes.PROVIDER_NOT_FOUND,
        `Unknown LLM provider "${id}". Available: ${[...this.factories.keys()].join(", ")}`
      );
    }
    const provider = factory();
    await provider.validateConfiguration();
    return provider;
  }
}

