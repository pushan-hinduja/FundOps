import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runAgent } from "@/lib/ai/agent/executor";
import type { ToolContext } from "@/lib/ai/tools/types";
import {
  createSession,
  getActiveSession,
  getSessionMessages,
  addMessageToSession,
  generateSessionTitle,
  updateSessionTitle,
  messagesToConversationHistory,
} from "@/lib/ai/agent/session";
import { trimConversationHistory } from "@/lib/ai/agent/context-window";

export async function POST(request: NextRequest) {
  try {
    const { message, sessionId: requestedSessionId } = await request.json();

    if (!message || typeof message !== "string") {
      return new Response(
        JSON.stringify({ error: "message is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Authenticate
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get user's organization
    const { data: userData } = await supabase
      .from("users")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (!userData?.organization_id) {
      return new Response(
        JSON.stringify({ error: "Organization not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const { data: orgData } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", userData.organization_id)
      .single();

    const orgName = orgData?.name || "your organization";

    const sessionCtx = {
      supabase,
      userId: user.id,
      organizationId: userData.organization_id,
    };

    // Resolve or create session
    let sessionId = typeof requestedSessionId === "string" ? requestedSessionId : null;
    let isNewSession = false;

    if (!sessionId) {
      // Try to find an active session
      const activeSession = await getActiveSession(sessionCtx);
      if (activeSession) {
        sessionId = activeSession.id;
      } else {
        // Create a new session
        const newSession = await createSession(sessionCtx);
        sessionId = newSession.id;
        isNewSession = true;
      }
    }

    // Load conversation history from DB
    let conversationHistory: { role: "user" | "assistant"; content: string }[] = [];
    if (!isNewSession) {
      const storedMessages = await getSessionMessages(sessionCtx, sessionId);
      const rawHistory = messagesToConversationHistory(storedMessages);
      conversationHistory = await trimConversationHistory(rawHistory);
    }

    // Persist the user message
    await addMessageToSession(sessionCtx, sessionId, {
      role: "user",
      content: message,
    });

    const toolContext: ToolContext = {
      supabase,
      organizationId: userData.organization_id,
      userId: user.id,
    };

    // Run the agent with a wrapper stream that captures the response for persistence
    const agentStream = runAgent({
      userMessage: message,
      conversationHistory,
      toolContext,
      orgName,
      sessionId: sessionId!,
    });

    // Wrap the agent stream to intercept done/text events for DB persistence
    const encoder = new TextEncoder();
    let accumulatedResponse = "";
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let toolCallsLog: any[] = [];

    const wrappedStream = new ReadableStream({
      async start(controller) {
        const reader = agentStream.getReader();
        const decoder = new TextDecoder();

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            // Forward to client
            controller.enqueue(value);

            // Parse events for persistence
            const text = decoder.decode(value, { stream: true });
            const lines = text.split("\n");
            let eventType = "";
            let eventData = "";

            for (const line of lines) {
              if (line.startsWith("event: ")) {
                eventType = line.slice(7);
              } else if (line.startsWith("data: ")) {
                eventData = line.slice(6);
              } else if (line === "" && eventType && eventData) {
                try {
                  const data = JSON.parse(eventData);
                  if (eventType === "text_delta") {
                    accumulatedResponse += data.delta;
                  } else if (eventType === "done") {
                    totalInputTokens = data.inputTokens || 0;
                    totalOutputTokens = data.outputTokens || 0;
                  } else if (eventType === "tool_result") {
                    toolCallsLog.push({
                      name: data.toolName,
                      summary: data.summary,
                    });
                  }
                } catch {
                  // skip parse errors
                }
                eventType = "";
                eventData = "";
              }
            }
          }

          // Persist the assistant response
          if (accumulatedResponse) {
            await addMessageToSession(sessionCtx, sessionId!, {
              role: "assistant",
              content: accumulatedResponse,
              toolCalls: toolCallsLog.length > 0 ? toolCallsLog : undefined,
              inputTokens: totalInputTokens,
              outputTokens: totalOutputTokens,
            });
          }

          // Auto-title the session after first response
          if (isNewSession && accumulatedResponse) {
            const title = await generateSessionTitle(message);
            await updateSessionTitle(sessionCtx, sessionId!, title);
          }

          // Send session info as a final SSE event
          controller.enqueue(
            encoder.encode(
              `event: session\ndata: ${JSON.stringify({ sessionId })}\n\n`
            )
          );

          controller.close();
        } catch (err) {
          console.error("[Chat] Stream wrapper error:", err);
          controller.close();
        }
      },
    });

    return new Response(wrappedStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("AI Chat error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process request" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
