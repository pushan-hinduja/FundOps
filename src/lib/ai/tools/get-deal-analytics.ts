import type { Tool } from "@anthropic-ai/sdk/resources/messages";
import type { ToolContext, ToolExecutor } from "./types";

export const getDealAnalyticsDefinition: Tool = {
  name: "get_deal_analytics",
  description:
    "Get aggregate analytics and close readiness metrics for a deal. Includes commitment velocity, conversion funnel (contacted → interested → committed → allocated), wire collection progress, and time-to-close estimates.",
  input_schema: {
    type: "object" as const,
    properties: {
      deal_name: {
        type: "string",
        description: "Deal name to analyze",
      },
      deal_id: {
        type: "string",
        description: "Exact deal UUID",
      },
    },
  },
};

export const executeGetDealAnalytics: ToolExecutor = async (
  input: Record<string, unknown>,
  ctx: ToolContext
): Promise<string> => {
  const { deal_name, deal_id } = input;

  // Resolve deal
  let dealQuery = ctx.supabase
    .from("deals")
    .select("id, name, company_name, target_raise, total_committed, total_interested, status, close_date, deadline, created_at")
    .eq("organization_id", ctx.organizationId);

  if (deal_id && typeof deal_id === "string") {
    dealQuery = dealQuery.eq("id", deal_id);
  } else if (deal_name && typeof deal_name === "string") {
    dealQuery = dealQuery.ilike("name", `%${deal_name}%`);
  } else {
    return JSON.stringify({ error: "Either deal_name or deal_id is required" });
  }

  const { data: deals, error: dealError } = await dealQuery.limit(1);

  if (dealError) {
    return JSON.stringify({ error: dealError.message });
  }

  const deal = deals?.[0];
  if (!deal) {
    return JSON.stringify({ error: "Deal not found" });
  }

  // Get all relationships for this deal
  const { data: rels, error: relsError } = await ctx.supabase
    .from("deal_lp_relationships")
    .select(
      "status, committed_amount, allocated_amount, wire_status, wire_amount_received, first_contact_at, latest_response_at, response_time_hours"
    )
    .eq("deal_id", deal.id);

  if (relsError) {
    return JSON.stringify({ error: relsError.message });
  }

  const relationships = rels || [];

  // Conversion funnel
  const funnel = {
    contacted: relationships.filter((r) => r.status === "contacted").length,
    interested: relationships.filter((r) => r.status === "interested").length,
    committed: relationships.filter((r) => r.status === "committed").length,
    allocated: relationships.filter((r) => r.status === "allocated").length,
    declined: relationships.filter((r) => r.status === "declined").length,
    total_lps: relationships.length,
  };

  // Wire collection
  const committedOrAllocated = relationships.filter(
    (r) => r.status === "committed" || r.status === "allocated"
  );
  const totalCommittedAmount = committedOrAllocated.reduce(
    (sum, r) => sum + (Number(r.committed_amount) || 0),
    0
  );
  const totalAllocatedAmount = committedOrAllocated.reduce(
    (sum, r) => sum + (Number(r.allocated_amount) || 0),
    0
  );
  const totalWiredAmount = committedOrAllocated.reduce(
    (sum, r) => sum + (Number(r.wire_amount_received) || 0),
    0
  );

  const wireBreakdown = {
    pending: committedOrAllocated.filter((r) => r.wire_status === "pending").length,
    partial: committedOrAllocated.filter((r) => r.wire_status === "partial").length,
    complete: committedOrAllocated.filter((r) => r.wire_status === "complete").length,
  };

  // Average response time
  const responseTimes = relationships
    .map((r) => Number(r.response_time_hours))
    .filter((t) => t > 0);
  const avgResponseTime =
    responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : null;

  // Progress metrics
  const targetRaise = Number(deal.target_raise) || 0;
  const commitmentProgress =
    targetRaise > 0 ? (totalCommittedAmount / targetRaise) * 100 : 0;
  const wireCollectionRate =
    totalCommittedAmount > 0
      ? (totalWiredAmount / totalCommittedAmount) * 100
      : 0;

  // Days metrics
  const createdAt = new Date(deal.created_at);
  const daysSinceCreation = Math.floor(
    (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
  );
  const daysToClose = deal.close_date
    ? Math.floor(
        (new Date(deal.close_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
    : null;

  return JSON.stringify({
    deal: {
      id: deal.id,
      name: deal.name,
      company_name: deal.company_name,
      status: deal.status,
      target_raise: targetRaise,
      close_date: deal.close_date,
    },
    funnel,
    financials: {
      total_committed: totalCommittedAmount,
      total_allocated: totalAllocatedAmount,
      total_wired: totalWiredAmount,
      commitment_progress_percent: Math.round(commitmentProgress * 10) / 10,
      wire_collection_rate_percent: Math.round(wireCollectionRate * 10) / 10,
    },
    wire_breakdown: wireBreakdown,
    timing: {
      days_since_creation: daysSinceCreation,
      days_to_close: daysToClose,
      avg_response_time_hours: avgResponseTime
        ? Math.round(avgResponseTime * 10) / 10
        : null,
    },
  });
};
