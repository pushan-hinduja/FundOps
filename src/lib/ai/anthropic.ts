import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY environment variable is not set");
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

// Haiku 4.5 — cost-efficient, high-volume email parsing
export const MODEL_ID = "claude-haiku-4-5-20251001";
export const MODEL_VERSION = "claude-haiku-4.5-v1";

// Sonnet 4 — higher quality for user-facing responses
export const SONNET_MODEL_ID = "claude-sonnet-4-20250514";
