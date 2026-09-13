import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

/** OpenRouter-backed provider (OpenAI-compatible chat completions API). */
export function createLovableAiGatewayProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "openrouter",
    baseURL: "https://openrouter.ai/api/v1",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
}

export const LEARNFLOW_MODEL = process.env["OPENROUTER_MODEL"] || "openai/gpt-4o-mini";

/** No vendor-specific provider options needed for OpenRouter's OpenAI-compatible API. */
export const LEARNFLOW_PROVIDER_OPTIONS = {} as const;

export function getGatewayKey() {
  const key = process.env["OPENROUTER_API_KEY"];
  if (!key) throw new Error("AI is not configured for this app yet.");
  return key;
}
