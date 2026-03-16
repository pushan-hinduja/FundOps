import type { Tool } from "@anthropic-ai/sdk/resources/messages";
import type { ToolContext, ToolExecutor } from "./types";
import { deduplicateMemory } from "../memory/dedup";

export const rememberDefinition: Tool = {
  name: "remember",
  description:
    "Store a fact for future reference. Use this when the user tells you something important about an LP, deal, or their preferences that should be remembered across conversations. Also use when the user explicitly says 'remember this' or similar.",
  input_schema: {
    type: "object" as const,
    properties: {
      category: {
        type: "string",
        enum: [
          "lp_preference",
          "lp_relationship",
          "deal_insight",
          "user_preference",
          "process_note",
          "market_context",
          "follow_up",
        ],
        description: "Category of the fact to remember",
      },
      content: {
        type: "string",
        description: "The fact to remember, as a concise statement",
      },
      lp_name: {
        type: "string",
        description: "Name of the related LP (if applicable)",
      },
      deal_name: {
        type: "string",
        description: "Name of the related deal (if applicable)",
      },
      expires_at: {
        type: "string",
        description:
          "ISO date for follow-ups (e.g. 2026-03-20T00:00:00Z), null for permanent memories",
      },
    },
    required: ["category", "content"],
  },
};

export const executeRemember: ToolExecutor = async (
  input: Record<string, unknown>,
  ctx: ToolContext
): Promise<string> => {
  const { category, content, lp_name, deal_name, expires_at } = input;

  if (!category || !content) {
    return JSON.stringify({ error: "category and content are required" });
  }

  // Resolve LP name to ID
  let lpContactId: string | null = null;
  if (lp_name && typeof lp_name === "string") {
    const { data: lps } = await ctx.supabase
      .from("lp_contacts")
      .select("id")
      .eq("organization_id", ctx.organizationId)
      .ilike("name", "%" + lp_name + "%")
      .limit(1);
    lpContactId = lps?.[0]?.id ?? null;
  }

  // Resolve deal name to ID
  let dealId: string | null = null;
  if (deal_name && typeof deal_name === "string") {
    const { data: deals } = await ctx.supabase
      .from("deals")
      .select("id")
      .eq("organization_id", ctx.organizationId)
      .ilike("name", "%" + deal_name + "%")
      .limit(1);
    dealId = deals?.[0]?.id ?? null;
  }

  // Check for duplicates
  const existingId = await deduplicateMemory(
    { supabase: ctx.supabase, userId: ctx.userId, organizationId: ctx.organizationId },
    {
      category: category as string,
      content: content as string,
      lpContactId,
      dealId,
      confidence: 1.0, // Explicit remembers are high confidence
    }
  );

  if (existingId) {
    return JSON.stringify({
      status: "updated",
      message: "Updated an existing similar memory with the latest information.",
    });
  }

  const { error } = await ctx.supabase.from("agent_memories").insert({
    user_id: ctx.userId,
    organization_id: ctx.organizationId,
    category,
    content,
    lp_contact_id: lpContactId,
    deal_id: dealId,
    confidence: 1.0,
    expires_at: typeof expires_at === "string" ? expires_at : null,
  });

  if (error) {
    return JSON.stringify({ error: "Failed to save memory: " + error.message });
  }

  return JSON.stringify({
    status: "saved",
    message: "I'll remember that for future conversations.",
  });
};
