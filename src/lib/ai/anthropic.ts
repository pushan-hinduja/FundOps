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

// Use Haiku 4.5 for cost-efficient email parsing
// Pricing: $1/MTok input, $5/MTok output
// Switch to Sonnet 4.5 if you need higher accuracy
export const MODEL_ID = "claude-haiku-4-5-20251001";
export const MODEL_VERSION = "claude-haiku-4.5-v1";
