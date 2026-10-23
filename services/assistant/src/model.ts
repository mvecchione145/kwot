import type { BaseModelConfig, Model } from "@strands-agents/sdk";
import { AnthropicModel } from "@strands-agents/sdk/models/anthropic";
import { OpenAIModel } from "@strands-agents/sdk/models/openai";

export type Provider = "ollama" | "anthropic";

export interface ModelSetup {
  provider: Provider;
  modelId: string;
  model: Model<BaseModelConfig>;
  /** Whether the model can be used right now (Ollama reachable with the model pulled, or an API key set). */
  available: () => Promise<boolean>;
}

/**
 * Ollama (open-weights model, the POC default) through its OpenAI-compatible endpoint.
 * The model must support tool calling, which the intake agent relies on.
 */
function ollamaSetup(): ModelSetup {
  const baseUrl = (process.env.OLLAMA_BASE_URL || "http://host.docker.internal:11434").replace(/\/$/, "");
  const modelId = process.env.OLLAMA_MODEL || "llama3.2:3b";
  const model = new OpenAIModel({
    api: "chat",
    modelId,
    apiKey: "ollama", // Ollama ignores it, but the OpenAI client requires one.
    // No automatic retries: a local generation can take minutes, and a retry repeats all of it.
    clientConfig: { baseURL: `${baseUrl}/v1`, maxRetries: 0 },
    maxTokens: 4_096,
  });
  return {
    provider: "ollama",
    modelId,
    model,
    available: async () => {
      try {
        const res = await fetch(`${baseUrl}/api/tags`, { signal: AbortSignal.timeout(2_000) });
        if (!res.ok) return false;
        const { models } = (await res.json()) as { models: { name: string }[] };
        const wanted = modelId.includes(":") ? modelId : `${modelId}:latest`;
        return models.some((m) => m.name === wanted);
      } catch {
        return false;
      }
    },
  };
}

function anthropicSetup(): ModelSetup {
  const apiKey = process.env.ANTHROPIC_API_KEY ?? "";
  const modelId = process.env.ASSISTANT_MODEL || "claude-opus-5-5";
  const model = new AnthropicModel({
    apiKey,
    modelId,
    maxTokens: 16_000,
    // Server-side fallback reroutes a safety-classifier refusal to another model
    // instead of failing the turn.
    betas: ["server-side-fallback-2026-07-01"],
    params: {
      fallbacks: "default",
      // Short conversational turns and a short document; low effort keeps latency down.
      output_config: { effort: "low" },
    },
  });
  return { provider: "anthropic", modelId, model, available: async () => apiKey !== "" };
}

export function createModelSetup(): ModelSetup {
  const provider = process.env.ASSISTANT_PROVIDER || "ollama";
  if (provider === "ollama") return ollamaSetup();
  if (provider === "anthropic") return anthropicSetup();
  throw new Error(`Unknown ASSISTANT_PROVIDER "${provider}" (expected "ollama" or "anthropic")`);
}
