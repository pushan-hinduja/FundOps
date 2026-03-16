import { SupabaseClient } from "@supabase/supabase-js";

interface DeduplicationContext {
  supabase: SupabaseClient;
  userId: string;
  organizationId: string;
}

interface MemoryCandidate {
  category: string;
  content: string;
  lpContactId: string | null;
  dealId: string | null;
  confidence: number;
}

/**
 * Check if a similar memory already exists. If so, update its confidence
 * and timestamp. Returns the existing memory ID if deduplicated, or null
 * if this is a new memory.
 */
export async function deduplicateMemory(
  ctx: DeduplicationContext,
  candidate: MemoryCandidate
): Promise<string | null> {
  // Look for existing active memories with the same category and entity references
  let query = ctx.supabase
    .from("agent_memories")
    .select("id, content, confidence")
    .eq("user_id", ctx.userId)
    .eq("organization_id", ctx.organizationId)
    .eq("category", candidate.category)
    .eq("is_active", true);

  if (candidate.lpContactId) {
    query = query.eq("lp_contact_id", candidate.lpContactId);
  }
  if (candidate.dealId) {
    query = query.eq("deal_id", candidate.dealId);
  }

  const { data: existing } = await query.limit(10);

  if (!existing || existing.length === 0) return null;

  // Simple content similarity: check if any existing memory covers the same fact.
  // Use substring matching as a lightweight approach (no embeddings yet).
  const candidateWords = new Set(
    candidate.content.toLowerCase().split(/\s+/).filter((w) => w.length > 3)
  );

  for (const mem of existing) {
    const memWords = new Set(
      mem.content.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3)
    );

    // Calculate word overlap
    let overlap = 0;
    for (const word of candidateWords) {
      if (memWords.has(word)) overlap++;
    }

    const overlapRatio = candidateWords.size > 0
      ? overlap / candidateWords.size
      : 0;

    if (overlapRatio > 0.5) {
      // High overlap — update existing memory
      const newConfidence = Math.min(1.0, Math.max(mem.confidence, candidate.confidence));
      await ctx.supabase
        .from("agent_memories")
        .update({
          content: candidate.content, // Use the newer phrasing
          confidence: newConfidence,
          updated_at: new Date().toISOString(),
        })
        .eq("id", mem.id);

      return mem.id;
    }
  }

  // Check for contradictions: same entity + category but different content
  // If the existing memory is very different, deactivate it and let the new one be inserted
  if (candidate.lpContactId || candidate.dealId) {
    for (const mem of existing) {
      const memWords = new Set(
        mem.content.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3)
      );
      let overlap = 0;
      for (const word of candidateWords) {
        if (memWords.has(word)) overlap++;
      }
      const overlapRatio = candidateWords.size > 0
        ? overlap / candidateWords.size
        : 0;

      // Low overlap on same entity + category = contradiction
      if (overlapRatio < 0.2) {
        await ctx.supabase
          .from("agent_memories")
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq("id", mem.id);
      }
    }
  }

  return null;
}
