import type { Tool } from "@anthropic-ai/sdk/resources/messages";
import type { ToolContext, ToolExecutor } from "./types";

export const getEngagementScoresDefinition: Tool = {
  name: "get_engagement_scores",
  description:
    "Calculate LP engagement metrics and identify engagement patterns. Returns response times, participation rates, interaction frequency, and engagement tier classification. Use to identify silent/at-risk LPs or highly engaged ones.",
  input_schema: {
    type: "object" as const,
    properties: {
      lp_id: {
        type: "string",
        description: "Specific LP UUID to analyze",
      },
      deal_id: {
        type: "string",
        description: "Scope engagement analysis to a specific deal",
      },
      engagement_tier: {
        type: "string",
        enum: ["high", "medium", "low", "silent"],
        description:
          "Filter by engagement tier: high (responded < 24h), medium (< 72h), low (< 168h), silent (no response > threshold or never)",
      },
      days_inactive_threshold: {
        type: "integer",
        description:
          "Number of days with no interaction to consider an LP 'silent' (default 14)",
      },
    },
  },
};

function classifyTier(
  avgResponseHours: number | null,
  lastInteraction: string | null,
  inactiveThreshold: number
): "high" | "medium" | "low" | "silent" {
  if (!lastInteraction) return "silent";

  const daysSince = Math.floor(
    (Date.now() - new Date(lastInteraction).getTime()) / (1000 * 60 * 60 * 24)
  );
  if (daysSince > inactiveThreshold) return "silent";

  if (avgResponseHours !== null) {
    if (avgResponseHours < 24) return "high";
    if (avgResponseHours < 72) return "medium";
    if (avgResponseHours < 168) return "low";
  }

  return "medium";
}

export const executeGetEngagementScores: ToolExecutor = async (
  input: Record<string, unknown>,
  ctx: ToolContext
): Promise<string> => {
  const { lp_id, deal_id, engagement_tier, days_inactive_threshold } = input;
  const inactiveThreshold = Number(days_inactive_threshold) || 14;

  if (deal_id && typeof deal_id === "string") {
    // Deal-scoped engagement: use deal_lp_relationships
    let query = ctx.supabase
      .from("deal_lp_relationships")
      .select(
        `lp_contact_id, status, committed_amount, response_time_hours,
         first_contact_at, latest_response_at,
         lp_contacts!inner(id, name, firm, email, avg_response_time_hours, participation_rate, last_interaction_at, total_commitments)`
      )
      .eq("deal_id", deal_id);

    if (lp_id && typeof lp_id === "string") {
      query = query.eq("lp_contact_id", lp_id);
    }

    const { data, error } = await query;

    if (error) {
      return JSON.stringify({ error: error.message });
    }

    const scored = (data || []).map((rel) => {
      const lp = rel.lp_contacts as unknown as Record<string, unknown>;
      const tier = classifyTier(
        Number(lp.avg_response_time_hours) || null,
        (lp.last_interaction_at as string) || null,
        inactiveThreshold
      );
      return {
        lp_id: lp.id,
        lp_name: lp.name,
        firm: lp.firm,
        email: lp.email,
        deal_status: rel.status,
        committed_amount: rel.committed_amount,
        avg_response_time_hours: lp.avg_response_time_hours,
        deal_response_time_hours: rel.response_time_hours,
        participation_rate: lp.participation_rate,
        last_interaction_at: lp.last_interaction_at,
        total_commitments: lp.total_commitments,
        engagement_tier: tier,
      };
    });

    const filtered =
      engagement_tier && typeof engagement_tier === "string"
        ? scored.filter((s) => s.engagement_tier === engagement_tier)
        : scored;

    return JSON.stringify({
      total: filtered.length,
      engagement_scores: filtered,
    });
  }

  // Org-wide engagement
  let lpQuery = ctx.supabase
    .from("lp_contacts")
    .select(
      "id, name, firm, email, avg_response_time_hours, participation_rate, last_interaction_at, total_commitments"
    )
    .eq("organization_id", ctx.organizationId);

  if (lp_id && typeof lp_id === "string") {
    lpQuery = lpQuery.eq("id", lp_id);
  }

  const { data: lps, error: lpError } = await lpQuery;

  if (lpError) {
    return JSON.stringify({ error: lpError.message });
  }

  const scored = (lps || []).map((lp) => {
    const tier = classifyTier(
      Number(lp.avg_response_time_hours) || null,
      lp.last_interaction_at,
      inactiveThreshold
    );
    return {
      lp_id: lp.id,
      lp_name: lp.name,
      firm: lp.firm,
      email: lp.email,
      avg_response_time_hours: lp.avg_response_time_hours,
      participation_rate: lp.participation_rate,
      last_interaction_at: lp.last_interaction_at,
      total_commitments: lp.total_commitments,
      engagement_tier: tier,
    };
  });

  const filtered =
    engagement_tier && typeof engagement_tier === "string"
      ? scored.filter((s) => s.engagement_tier === engagement_tier)
      : scored;

  return JSON.stringify({
    total: filtered.length,
    engagement_scores: filtered,
  });
};
