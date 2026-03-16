import { getAnthropicClient, MODEL_ID } from "../anthropic";

/**
 * Rough token estimation: ~4 characters per token for English text.
 * Conservative enough to avoid overflows with the 200K context window.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function estimateMessagesTokens(
  messages: { role: string; content: string }[]
): number {
  return messages.reduce(
    (sum, msg) => sum + estimateTokens(msg.content) + 4, // 4 tokens overhead per message
    0
  );
}

// Token budgets
const SYSTEM_PROMPT_BUDGET = 3000;
const MEMORY_BUDGET = 2000; // Reserved for Phase 4
const MAX_HISTORY_TOKENS = 50000;
const CURRENT_TURN_BUDGET = 30000;
const RESPONSE_BUDGET = 4096;

export const TOTAL_BUDGET =
  SYSTEM_PROMPT_BUDGET + MEMORY_BUDGET + MAX_HISTORY_TOKENS + CURRENT_TURN_BUDGET + RESPONSE_BUDGET;

/**
 * Trim conversation history to fit within token budget.
 * Keeps the most recent `keepRecent` messages and summarizes the rest.
 */
export async function trimConversationHistory(
  messages: { role: "user" | "assistant"; content: string }[],
  maxTokens: number = MAX_HISTORY_TOKENS,
  keepRecent: number = 10
): Promise<{ role: "user" | "assistant"; content: string }[]> {
  const totalTokens = estimateMessagesTokens(messages);

  if (totalTokens <= maxTokens) {
    return messages;
  }

  // Split into old and recent
  const splitIndex = Math.max(0, messages.length - keepRecent);
  const oldMessages = messages.slice(0, splitIndex);
  const recentMessages = messages.slice(splitIndex);

  if (oldMessages.length === 0) {
    // Can't trim further — return recent messages as-is
    return recentMessages;
  }

  // Summarize old messages
  const summary = await summarizeMessages(oldMessages);

  return [
    {
      role: "assistant" as const,
      content: `[Previous conversation summary: ${summary}]`,
    },
    ...recentMessages,
  ];
}

/**
 * Summarize a set of messages into a compact summary using Haiku.
 */
async function summarizeMessages(
  messages: { role: string; content: string }[]
): Promise<string> {
  const conversationText = messages
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n\n");

  try {
    const client = getAnthropicClient();
    const response = await client.messages.create({
      model: MODEL_ID,
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: `Summarize this conversation in 2-3 sentences, preserving key facts, numbers, entity names (LPs, deals), and any decisions or action items:\n\n${conversationText}`,
        },
      ],
    });

    const text = response.content.find((b) => b.type === "text");
    if (text && text.type === "text") {
      return text.text.trim();
    }
    return "Previous conversation context was summarized.";
  } catch {
    return "Previous conversation context was summarized.";
  }
}
