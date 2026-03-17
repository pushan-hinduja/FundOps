import type { Tool } from "@anthropic-ai/sdk/resources/messages";
import type { ToolContext, ToolExecutor } from "./types";

export const getLpMatchesDefinition: Tool = {
  name: "get_lp_matches",
  description:
    "Get LP match scores for a deal. Shows which LPs are the best fit based on check size compatibility, sector alignment, stage fit, geographic fit, and recency of activity. Only available for private deals that have been scored.",
  input_schema: {
    type: "object" as const,
    properties: {
      deal_name: {
        type: "string",
        description: "Deal name to get matches for",
      },
      deal_id: {
        type: "string",
        description: "Deal UUID",
      },
      min_score: {
        type: "integer",
        description: "Minimum total score to include (default 0, max 85)",
      },
      limit: {
        type: "integer",
        description: "Maximum results to return (default 20)",
      },
    },
  },
};

export const executeGetLpMatches: ToolExecutor = async (
  input: Record<string, unknown>,
  ctx: ToolContext
): Promise<string> => {
  const { deal_name, deal_id, min_score, limit: rawLimit } = input;
  const limit = Math.min(Number(rawLimit) || 20, 50);
  const minScoreThreshold = Number(min_score) || 0;

  // Resolve deal ID
  let resolvedDealId = typeof deal_id === "string" ? deal_id : null;
  if (!resolvedDealId && deal_name && typeof deal_name === "string") {
    const { data: deals } = await ctx.supabase
      .from("deals")
      .select("id")
      .eq("organization_id", ctx.organizationId)
      .ilike("name", "%" + deal_name + "%")
      .limit(1);
    resolvedDealId = deals?.[0]?.id ?? null;
    if (!resolvedDealId) {
      return JSON.stringify({ error: "No deal found matching \"" + deal_name + "\"" });
    }
  }

  if (!resolvedDealId) {
    return JSON.stringify({ error: "Either deal_name or deal_id is required" });
  }

  const { data, error } = await ctx.supabase
    .from("lp_match_scores")
    .select(
      "total_score, check_size_score, sector_score, stage_score, geography_score, recency_score, score_breakdown, is_excluded, lp_contacts(id, name, email, firm, preferred_check_size, investor_type)"
    )
    .eq("deal_id", resolvedDealId)
    .gte("total_score", minScoreThreshold)
    .eq("is_excluded", false)
    .order("total_score", { ascending: false })
    .limit(limit);

  if (error) {
    return JSON.stringify({ error: error.message });
  }

  if (!data || data.length === 0) {
    return JSON.stringify({
      total: 0,
      matches: [],
      note: "No match scores found. The user may need to click 'Match LPs' on the deal page to compute scores first.",
    });
  }

  return JSON.stringify({
    total: data.length,
    matches: data,
  });
};
