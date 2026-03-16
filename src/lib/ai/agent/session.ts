import { SupabaseClient } from "@supabase/supabase-js";
import type { ChatSession, ChatMessage } from "@/lib/supabase/types";
import { getAnthropicClient, MODEL_ID } from "../anthropic";

interface SessionContext {
  supabase: SupabaseClient;
  userId: string;
  organizationId: string;
}

export async function createSession(ctx: SessionContext): Promise<ChatSession> {
  const { data, error } = await ctx.supabase
    .from("chat_sessions")
    .insert({
      user_id: ctx.userId,
      organization_id: ctx.organizationId,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create session: ${error.message}`);
  return data;
}

export async function getSession(
  ctx: SessionContext,
  sessionId: string
): Promise<ChatSession | null> {
  const { data, error } = await ctx.supabase
    .from("chat_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("user_id", ctx.userId)
    .single();

  if (error) return null;
  return data;
}

export async function listSessions(
  ctx: SessionContext,
  limit = 20
): Promise<ChatSession[]> {
  const { data, error } = await ctx.supabase
    .from("chat_sessions")
    .select("*")
    .eq("user_id", ctx.userId)
    .eq("organization_id", ctx.organizationId)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Failed to list sessions: ${error.message}`);
  return data || [];
}

export async function getSessionMessages(
  ctx: SessionContext,
  sessionId: string,
  limit = 50
): Promise<ChatMessage[]> {
  const { data, error } = await ctx.supabase
    .from("chat_messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("sequence_number", { ascending: true })
    .limit(limit);

  if (error) throw new Error(`Failed to get messages: ${error.message}`);
  return data || [];
}

export async function addMessageToSession(
  ctx: SessionContext,
  sessionId: string,
  message: {
    role: "user" | "assistant" | "system";
    content: string;
    toolCalls?: unknown[];
    inputTokens?: number;
    outputTokens?: number;
  }
): Promise<ChatMessage> {
  // Get the next sequence number
  const { data: lastMsg } = await ctx.supabase
    .from("chat_messages")
    .select("sequence_number")
    .eq("session_id", sessionId)
    .order("sequence_number", { ascending: false })
    .limit(1);

  const nextSeq = (lastMsg?.[0]?.sequence_number ?? 0) + 1;

  const { data, error } = await ctx.supabase
    .from("chat_messages")
    .insert({
      session_id: sessionId,
      role: message.role,
      content: message.content,
      tool_calls: message.toolCalls || null,
      input_tokens: message.inputTokens || null,
      output_tokens: message.outputTokens || null,
      sequence_number: nextSeq,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to add message: ${error.message}`);
  return data;
}

export async function deactivateSession(
  ctx: SessionContext,
  sessionId: string
): Promise<void> {
  const { error } = await ctx.supabase
    .from("chat_sessions")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", sessionId)
    .eq("user_id", ctx.userId);

  if (error) throw new Error(`Failed to deactivate session: ${error.message}`);
}

export async function deleteSession(
  ctx: SessionContext,
  sessionId: string
): Promise<void> {
  const { error } = await ctx.supabase
    .from("chat_sessions")
    .delete()
    .eq("id", sessionId)
    .eq("user_id", ctx.userId);

  if (error) throw new Error(`Failed to delete session: ${error.message}`);
}

export async function getActiveSession(
  ctx: SessionContext
): Promise<ChatSession | null> {
  const { data, error } = await ctx.supabase
    .from("chat_sessions")
    .select("*")
    .eq("user_id", ctx.userId)
    .eq("organization_id", ctx.organizationId)
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (error) return null;
  return data?.[0] ?? null;
}

export async function generateSessionTitle(firstMessage: string): Promise<string> {
  try {
    const client = getAnthropicClient();
    const response = await client.messages.create({
      model: MODEL_ID,
      max_tokens: 30,
      messages: [
        {
          role: "user",
          content: `Generate a very short title (max 5 words) for a chat conversation that starts with this message. Return ONLY the title, no quotes or punctuation.\n\nMessage: "${firstMessage}"`,
        },
      ],
    });

    const text = response.content.find((b) => b.type === "text");
    if (text && text.type === "text") {
      return text.text.trim().slice(0, 100);
    }
    return firstMessage.slice(0, 50);
  } catch {
    return firstMessage.slice(0, 50);
  }
}

export async function updateSessionTitle(
  ctx: SessionContext,
  sessionId: string,
  title: string
): Promise<void> {
  await ctx.supabase
    .from("chat_sessions")
    .update({ title })
    .eq("id", sessionId)
    .eq("user_id", ctx.userId);
}

/**
 * Convert stored ChatMessages to the Anthropic API message format
 * (only user and assistant messages, text content only — tool_calls are excluded
 * since they were already resolved in the original conversation)
 */
export function messagesToConversationHistory(
  messages: ChatMessage[]
): { role: "user" | "assistant"; content: string }[] {
  return messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));
}
