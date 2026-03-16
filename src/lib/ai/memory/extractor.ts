import { SupabaseClient } from "@supabase/supabase-js";
import { getAnthropicClient, MODEL_ID } from "../anthropic";
import { deduplicateMemory } from "./dedup";

interface ExtractionContext {
  supabase: SupabaseClient;
  userId: string;
  organizationId: string;
  sessionId?: string;
}

interface ExtractedFact {
  category: string;
  content: string;
  related_lp_name?: string;
  related_deal_name?: string;
  confidence: number;
  expires_at?: string;
}

function buildExtractionPrompt(userMessage: string, assistantResponse: string): string {
  return [
    "Analyze this conversation exchange and extract durable facts worth remembering for future conversations.",
    "",
    "Categories:",
    "- lp_preference: LP communication preferences, investment criteria, personal notes",
    "- lp_relationship: Relationships between LPs, founders, or other contacts",
    "- deal_insight: Non-obvious deal characteristics or dynamics",
    "- user_preference: How the user likes information presented",
    "- process_note: Workflow or process requirements mentioned",
    "- market_context: Market conditions or macro factors mentioned",
    "- follow_up: Action items or future tasks mentioned (include a date if mentioned)",
    "",
    "For each fact, return a JSON object with:",
    '- category (one of the above)',
    '- content (concise factual statement)',
    '- related_lp_name (if applicable, null otherwise)',
    '- related_deal_name (if applicable, null otherwise)',
    '- confidence (0.0-1.0, how certain you are this is a durable fact)',
    '- expires_at (ISO date string for follow_ups, null otherwise)',
    "",
    "Return a JSON array. Only extract genuinely useful, durable facts — not conversational filler or data that was simply queried from the database. If nothing worth remembering, return [].",
    "",
    "User: " + userMessage,
    "",
    "Assistant: " + assistantResponse,
  ].join("\n");
}

/**
 * Extract durable facts from a conversation exchange and persist them as memories.
 * Runs asynchronously — should not block the user response.
 */
export async function extractFacts(
  ctx: ExtractionContext,
  userMessage: string,
  assistantResponse: string
): Promise<void> {
  try {
    const client = getAnthropicClient();

    const response = await client.messages.create({
      model: MODEL_ID,
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: buildExtractionPrompt(userMessage, assistantResponse),
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") return;

    // Parse JSON array from response
    const jsonMatch = textBlock.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return;

    const facts: ExtractedFact[] = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(facts) || facts.length === 0) return;

    for (const fact of facts) {
      if (!fact.category || !fact.content || fact.confidence < 0.5) continue;

      // Resolve LP name to ID
      let lpContactId: string | null = null;
      if (fact.related_lp_name) {
        const { data: lps } = await ctx.supabase
          .from("lp_contacts")
          .select("id")
          .eq("organization_id", ctx.organizationId)
          .ilike("name", "%" + fact.related_lp_name + "%")
          .limit(1);
        lpContactId = lps?.[0]?.id ?? null;
      }

      // Resolve deal name to ID
      let dealId: string | null = null;
      if (fact.related_deal_name) {
        const { data: deals } = await ctx.supabase
          .from("deals")
          .select("id")
          .eq("organization_id", ctx.organizationId)
          .ilike("name", "%" + fact.related_deal_name + "%")
          .limit(1);
        dealId = deals?.[0]?.id ?? null;
      }

      // Check for duplicates
      const existingId = await deduplicateMemory(
        { supabase: ctx.supabase, userId: ctx.userId, organizationId: ctx.organizationId },
        {
          category: fact.category,
          content: fact.content,
          lpContactId,
          dealId,
          confidence: fact.confidence,
        }
      );

      if (existingId) {
        console.log("[Memory] Deduplicated memory:", existingId);
        continue;
      }

      // Insert new memory
      const { error } = await ctx.supabase.from("agent_memories").insert({
        user_id: ctx.userId,
        organization_id: ctx.organizationId,
        category: fact.category,
        content: fact.content,
        lp_contact_id: lpContactId,
        deal_id: dealId,
        source_session_id: ctx.sessionId || null,
        confidence: fact.confidence,
        expires_at: fact.expires_at || null,
      });

      if (error) {
        console.error("[Memory] Insert error:", error.message);
      } else {
        console.log("[Memory] Extracted:", fact.category, "-", fact.content.slice(0, 60));
      }
    }
  } catch (err) {
    console.error("[Memory] Extraction error:", err);
  }
}
