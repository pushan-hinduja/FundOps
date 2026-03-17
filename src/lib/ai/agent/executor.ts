import { getAnthropicClient, AGENT_MODEL_ID } from "../anthropic";
import { TOOL_DEFINITIONS, executeTool } from "../tools";
import type { ToolContext } from "../tools/types";
import { buildAgentSystemPrompt } from "./system-prompt";
import type { AgentConfig, AgentEvent, ToolCallLogEntry } from "./types";
import { DEFAULT_AGENT_CONFIG } from "./types";
import { loadRelevantMemories } from "../memory/loader";
import { extractFacts } from "../memory/extractor";

interface RunAgentParams {
  userMessage: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  conversationHistory: any[];
  toolContext: ToolContext;
  orgName: string;
  sessionId?: string;
  config?: AgentConfig;
}

/**
 * Runs the agent loop and returns an SSE-compatible ReadableStream.
 *
 * Architecture:
 * - Tool-calling iterations use non-streaming API calls (need complete response to extract tool_use blocks)
 * - Final text response is streamed token-by-token via the Anthropic streaming API
 * - SSE events are emitted throughout for the frontend to consume
 */
export function runAgent(params: RunAgentParams): ReadableStream<Uint8Array> {
  const {
    userMessage,
    conversationHistory,
    toolContext,
    orgName,
    sessionId,
    config = DEFAULT_AGENT_CONFIG,
  } = params;

  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      function send(event: AgentEvent) {
        const data = JSON.stringify(event);
        controller.enqueue(encoder.encode(`event: ${event.type}\ndata: ${data}\n\n`));
      }

      try {
        const client = getAnthropicClient();

        // Load relevant memories for this conversation
        let memoriesSection = "";
        try {
          memoriesSection = await loadRelevantMemories(
            {
              supabase: toolContext.supabase,
              userId: toolContext.userId,
              organizationId: toolContext.organizationId,
            },
            userMessage
          );
        } catch (err) {
          console.error("[Agent] Memory loading error:", err);
        }

        const systemPrompt = buildAgentSystemPrompt(orgName, memoriesSection);

        // Build messages array
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const messages: any[] = [...conversationHistory];
        messages.push({ role: "user", content: userMessage });

        let iterations = 0;
        const toolCallLog: ToolCallLogEntry[] = [];
        let totalInputTokens = 0;
        let totalOutputTokens = 0;

        // Agent loop: non-streaming tool iterations
        while (iterations < config.maxIterations) {
          iterations++;

          const response = await client.messages.create({
            model: AGENT_MODEL_ID,
            max_tokens: config.maxTokens,
            system: systemPrompt,
            tools: TOOL_DEFINITIONS,
            messages,
          });

          totalInputTokens += response.usage.input_tokens;
          totalOutputTokens += response.usage.output_tokens;

          const toolUseBlocks = response.content.filter(
            (block) => block.type === "tool_use"
          );

          // No tool calls or stop_reason is not tool_use → final response
          if (toolUseBlocks.length === 0 || response.stop_reason !== "tool_use") {
            const textContent = response.content.find(
              (block) => block.type === "text"
            );
            const finalText = textContent && textContent.type === "text" ? textContent.text : "";
            if (finalText) {
              send({ type: "text_delta", delta: finalText });
            }

            send({
              type: "done",
              toolCallsMade: toolCallLog.length,
              inputTokens: totalInputTokens,
              outputTokens: totalOutputTokens,
            });

            // Async fact extraction (fire and forget)
            if (finalText) {
              extractFacts(
                {
                  supabase: toolContext.supabase,
                  userId: toolContext.userId,
                  organizationId: toolContext.organizationId,
                  sessionId,
                },
                userMessage,
                finalText
              ).catch((err) => console.error("[Agent] Fact extraction error:", err));
            }

            controller.close();
            return;
          }

          // We have tool calls to execute
          // Append assistant message with tool_use blocks
          messages.push({ role: "assistant", content: response.content });

          // Execute each tool call
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const toolResults: any[] = [];

          for (const block of toolUseBlocks) {
            if (block.type !== "tool_use") continue;

            // Emit thinking event
            send({
              type: "thinking",
              toolName: block.name,
              iteration: iterations,
            });

            const startTime = Date.now();
            const result = await executeTool(
              block.name,
              block.input as Record<string, unknown>,
              toolContext
            );
            const durationMs = Date.now() - startTime;

            toolCallLog.push({
              name: block.name,
              input: block.input as Record<string, unknown>,
              durationMs,
              resultSizeBytes: result.length,
            });

            // Emit tool result summary
            const summary = summarizeToolResult(block.name, result);
            send({ type: "tool_result", toolName: block.name, summary });

            toolResults.push({
              type: "tool_result",
              tool_use_id: block.id,
              content: result,
            });
          }

          // Append tool results as user message
          messages.push({ role: "user", content: toolResults });
        }

        // After all tool iterations, make a final streaming call for the text response
        const stream = client.messages.stream({
          model: AGENT_MODEL_ID,
          max_tokens: config.maxTokens,
          system: systemPrompt,
          tools: TOOL_DEFINITIONS,
          messages,
        });

        let streamedText = "";
        stream.on("text", (delta) => {
          streamedText += delta;
          send({ type: "text_delta", delta });
        });

        const finalMessage = await stream.finalMessage();
        totalInputTokens += finalMessage.usage.input_tokens;
        totalOutputTokens += finalMessage.usage.output_tokens;

        send({
          type: "done",
          toolCallsMade: toolCallLog.length,
          inputTokens: totalInputTokens,
          outputTokens: totalOutputTokens,
        });

        // Async fact extraction (fire and forget)
        if (streamedText) {
          extractFacts(
            {
              supabase: toolContext.supabase,
              userId: toolContext.userId,
              organizationId: toolContext.organizationId,
              sessionId,
            },
            userMessage,
            streamedText
          ).catch((err) => console.error("[Agent] Fact extraction error:", err));
        }

        controller.close();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "An unexpected error occurred";
        console.error("[Agent] Executor error:", err);
        send({ type: "error", message });
        controller.close();
      }
    },
  });
}

/**
 * Create a short human-readable summary of a tool result for the thinking indicator.
 */
function summarizeToolResult(toolName: string, result: string): string {
  try {
    const parsed = JSON.parse(result);

    if (parsed.error) {
      return `Error: ${parsed.error}`;
    }

    switch (toolName) {
      case "query_lps":
        return `Found ${parsed.total ?? 0} LP(s)`;
      case "get_deal_pipeline":
        return `Found ${parsed.total ?? 0} deal(s)`;
      case "get_commitment_status":
        return `Found ${parsed.total ?? 0} commitment(s)`;
      case "get_email_history":
        return `Found ${parsed.total ?? 0} email(s)`;
      case "get_engagement_scores":
        return `Scored ${parsed.total ?? 0} LP(s)`;
      case "get_deal_analytics":
        return `Analyzed deal: ${parsed.deal?.name ?? "unknown"}`;
      case "get_wire_status":
        return `Found ${parsed.total ?? 0} wire(s)`;
      case "get_investor_updates":
        return `Found ${parsed.total ?? 0} update(s)`;
      case "search_across_all": {
        const parts: string[] = [];
        if (parsed.lps?.total) parts.push(`${parsed.lps.total} LP(s)`);
        if (parsed.deals?.total) parts.push(`${parsed.deals.total} deal(s)`);
        if (parsed.emails?.total) parts.push(`${parsed.emails.total} email(s)`);
        return parts.length > 0 ? `Found ${parts.join(", ")}` : "No results";
      }
      case "draft_email":
        return `Drafted email to ${parsed.metadata?.lp_name ?? "LP"}`;
      case "remember":
        return parsed.status === "saved" ? "Saved to memory" : "Updated memory";
      case "get_lp_matches":
        return `Found ${parsed.total ?? 0} LP match(es)`;
      default:
        return `Completed`;
    }
  } catch {
    return "Completed";
  }
}
