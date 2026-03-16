export interface AgentConfig {
  maxIterations: number;
  maxTokens: number;
}

export const DEFAULT_AGENT_CONFIG: AgentConfig = {
  maxIterations: 10,
  maxTokens: 4096,
};

// SSE event types sent from backend to frontend
export type AgentEvent =
  | { type: "thinking"; toolName: string; iteration: number }
  | { type: "tool_result"; toolName: string; summary: string }
  | { type: "text_delta"; delta: string }
  | { type: "done"; toolCallsMade: number; inputTokens: number; outputTokens: number }
  | { type: "error"; message: string };

export interface ToolCallLogEntry {
  name: string;
  input: Record<string, unknown>;
  durationMs: number;
  resultSizeBytes: number;
}
