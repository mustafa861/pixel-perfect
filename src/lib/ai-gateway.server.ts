import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export function createOpenRouterProvider(
  openRouterApiKey: string,
  options?: { structuredOutputs?: boolean },
) {
  return createOpenAICompatible({
    name: "openrouter",
    baseURL: "https://openrouter.ai/api/v1",
    supportsStructuredOutputs: options?.structuredOutputs ?? false,
    headers: {
      Authorization: `Bearer ${openRouterApiKey}`,
    },
  });
}

export const LEARNFLOW_MODEL = "openai/gpt-4o-mini";

/** Shared provider options for chat calls. */
export const LEARNFLOW_PROVIDER_OPTIONS = {
  openrouter: { max_completion_tokens: 1600 },
} as const;

export function getGatewayKey() {
  const key = process.env["OPENROUTER_API_KEY"];
  if (!key) throw new Error("AI is not configured for this app yet.");
  return key;
}
