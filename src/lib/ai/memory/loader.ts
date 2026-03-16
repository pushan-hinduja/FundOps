import { SupabaseClient } from "@supabase/supabase-js";
import type { AgentMemory } from "@/lib/supabase/types";

interface LoaderContext {
  supabase: SupabaseClient;
  userId: string;
  organizationId: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  lp_preference: "LP Preference",
  lp_relationship: "LP Relationship",
  deal_insight: "Deal Insight",
  user_preference: "User Preference",
  process_note: "Process Note",
  market_context: "Market Context",
  follow_up: "Follow-up",
};

/**
 * Load relevant memories for the current conversation turn.
 * Returns a formatted string to inject into the system prompt.
 */
export async function loadRelevantMemories(
  ctx: LoaderContext,
  userMessage: string
): Promise<string> {
  const loadedIds: Set<string> = new Set();
  const memories: AgentMemory[] = [];

  // 1. Always load user preferences (up to 5)
  const { data: preferences } = await ctx.supabase
    .from("agent_memories")
    .select("*")
    .eq("user_id", ctx.userId)
    .eq("organization_id", ctx.organizationId)
    .eq("category", "user_preference")
    .eq("is_active", true)
    .order("confidence", { ascending: false })
    .limit(5);

  for (const m of preferences || []) {
    memories.push(m);
    loadedIds.add(m.id);
  }

  // 2. Find entity names mentioned in the user message
  const lpIds = await findMentionedLps(ctx, userMessage);
  const dealIds = await findMentionedDeals(ctx, userMessage);

  // 3. Load entity-specific memories
  if (lpIds.length > 0) {
    const { data: lpMemories } = await ctx.supabase
      .from("agent_memories")
      .select("*")
      .eq("user_id", ctx.userId)
      .eq("is_active", true)
      .in("lp_contact_id", lpIds)
      .order("confidence", { ascending: false })
      .limit(10);

    for (const m of lpMemories || []) {
      if (!loadedIds.has(m.id)) {
        memories.push(m);
        loadedIds.add(m.id);
      }
    }
  }

  if (dealIds.length > 0) {
    const { data: dealMemories } = await ctx.supabase
      .from("agent_memories")
      .select("*")
      .eq("user_id", ctx.userId)
      .eq("is_active", true)
      .in("deal_id", dealIds)
      .order("confidence", { ascending: false })
      .limit(10);

    for (const m of dealMemories || []) {
      if (!loadedIds.has(m.id)) {
        memories.push(m);
        loadedIds.add(m.id);
      }
    }
  }

  // 4. Load recent high-confidence memories (catch-all)
  const { data: recent } = await ctx.supabase
    .from("agent_memories")
    .select("*")
    .eq("user_id", ctx.userId)
    .eq("organization_id", ctx.organizationId)
    .eq("is_active", true)
    .order("confidence", { ascending: false })
    .order("last_accessed_at", { ascending: false, nullsFirst: false })
    .limit(10);

  for (const m of recent || []) {
    if (!loadedIds.has(m.id) && memories.length < 25) {
      memories.push(m);
      loadedIds.add(m.id);
    }
  }

  // 5. Load active follow-ups
  const { data: followups } = await ctx.supabase
    .from("agent_memories")
    .select("*")
    .eq("user_id", ctx.userId)
    .eq("organization_id", ctx.organizationId)
    .eq("category", "follow_up")
    .eq("is_active", true)
    .or("expires_at.is.null,expires_at.gt." + new Date().toISOString())
    .order("expires_at", { ascending: true, nullsFirst: false })
    .limit(5);

  for (const m of followups || []) {
    if (!loadedIds.has(m.id)) {
      memories.push(m);
      loadedIds.add(m.id);
    }
  }

  if (memories.length === 0) return "";

  // 6. Update access counts (fire and forget)
  const ids = Array.from(loadedIds);
  if (ids.length > 0) {
    // Simple update — increment is approximate but sufficient
    ctx.supabase
      .from("agent_memories")
      .update({ last_accessed_at: new Date().toISOString() })
      .in("id", ids)
      .then(() => {});
  }

  // 7. Format for system prompt
  return formatMemoriesForPrompt(memories);
}

function formatMemoriesForPrompt(memories: AgentMemory[]): string {
  const lines = memories.map((m) => {
    const label = CATEGORY_LABELS[m.category] || m.category;
    let line = "- [" + label + "] " + m.content;
    if (m.category === "follow_up" && m.expires_at) {
      line += " (due: " + new Date(m.expires_at).toLocaleDateString() + ")";
    }
    return line;
  });

  return [
    "",
    "## Your Memories About This User and Their Contacts",
    "",
    "These are facts you've learned from previous conversations. Use them to provide more personalized and contextual responses.",
    "",
    ...lines,
  ].join("\n");
}

/**
 * Find LP IDs mentioned in the user message by matching against known LP names.
 */
async function findMentionedLps(
  ctx: LoaderContext,
  message: string
): Promise<string[]> {
  const msgLower = message.toLowerCase();

  // Fetch LP names for this org (cached per-request)
  const { data: lps } = await ctx.supabase
    .from("lp_contacts")
    .select("id, name")
    .eq("organization_id", ctx.organizationId)
    .limit(200);

  if (!lps) return [];

  return lps
    .filter((lp) => {
      const name = lp.name?.toLowerCase();
      if (!name || name.length < 3) return false;
      return msgLower.includes(name);
    })
    .map((lp) => lp.id);
}

/**
 * Find deal IDs mentioned in the user message by matching against known deal names.
 */
async function findMentionedDeals(
  ctx: LoaderContext,
  message: string
): Promise<string[]> {
  const msgLower = message.toLowerCase();

  const { data: deals } = await ctx.supabase
    .from("deals")
    .select("id, name")
    .eq("organization_id", ctx.organizationId)
    .limit(100);

  if (!deals) return [];

  return deals
    .filter((deal) => {
      const name = deal.name?.toLowerCase();
      if (!name || name.length < 3) return false;
      return msgLower.includes(name);
    })
    .map((deal) => deal.id);
}
