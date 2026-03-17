import type { Tool } from "@anthropic-ai/sdk/resources/messages";
import type { ToolContext, ToolExecutor } from "./types";
import { computeMatches } from "../matching/compute-matches";

export const getLpMatchesDefinition: Tool = {
  name: "get_lp_matches",
  description:
    "Get LP match scores for any deal (scored out of 100). Shows which LPs are the best fit based on check size compatibility (30pts), sector alignment (25pts), stage fit (25pts), geographic fit (10pts), and recency of activity (10pts). If scores haven't been computed yet, this tool will compute them automatically.",
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
        description: "Minimum total score to include (default 0, max 100)",
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

  // Check if scores exist
  const { data: existing } = await ctx.supabase
    .from("lp_match_scores")
    .select("id")
    .eq("deal_id", resolvedDealId)
    .limit(1);

  // If no scores exist, compute them
  if (!existing || existing.length === 0) {
    try {
      await computeMatches({
        supabase: ctx.supabase,
        dealId: resolvedDealId,
        organizationId: ctx.organizationId,
      });
    } catch (err) {
      return JSON.stringify({
        error: "Failed to compute match scores: " + (err instanceof Error ? err.message : "unknown error"),
      });
    }
  }

  // Fetch scores
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

  return JSON.stringify({
    total: data?.length || 0,
    matches: data || [],
  });
};
