import type { Tool } from "@anthropic-ai/sdk/resources/messages";
import type { ToolContext, ToolExecutor } from "./types";

export const getInvestorUpdatesDefinition: Tool = {
  name: "get_investor_updates",
  description:
    "Get investor update history and status for deals. Shows update schedule, which updates have been sent to LPs, pending requests to founders, and response tracking.",
  input_schema: {
    type: "object" as const,
    properties: {
      deal_name: {
        type: "string",
        description: "Deal name to check updates for",
      },
      deal_id: {
        type: "string",
        description: "Exact deal UUID",
      },
      status_filter: {
        type: "string",
        enum: [
          "pending_request",
          "request_sent",
          "response_received",
          "sent_to_lps",
        ],
        description: "Filter by update status",
      },
      limit: {
        type: "integer",
        description: "Maximum updates to return (default 10)",
      },
    },
  },
};

export const executeGetInvestorUpdates: ToolExecutor = async (
  input: Record<string, unknown>,
  ctx: ToolContext
): Promise<string> => {
  const { deal_name, deal_id, status_filter, limit: rawLimit } = input;
  const limit = Math.min(Number(rawLimit) || 10, 50);

  // Resolve deal
  let resolvedDealId = typeof deal_id === "string" ? deal_id : null;
  if (!resolvedDealId && deal_name && typeof deal_name === "string") {
    const { data: deals } = await ctx.supabase
      .from("deals")
      .select("id")
      .eq("organization_id", ctx.organizationId)
      .ilike("name", `%${deal_name}%`)
      .limit(1);
    resolvedDealId = deals?.[0]?.id ?? null;
    if (!resolvedDealId) {
      return JSON.stringify({ error: `No deal found matching "${deal_name}"` });
    }
  }

  let query = ctx.supabase
    .from("investor_updates")
    .select(
      `id, deal_id, update_number, status, due_date,
       request_sent_at, response_received_at, response_body,
       lp_email_sent_at, sent_by, created_at,
       deals!inner(id, name, organization_id)`
    )
    .eq("deals.organization_id", ctx.organizationId)
    .order("due_date", { ascending: false })
    .limit(limit);

  if (resolvedDealId) {
    query = query.eq("deal_id", resolvedDealId);
  }

  if (status_filter && typeof status_filter === "string") {
    query = query.eq("status", status_filter);
  }

  const { data, error } = await query;

  if (error) {
    return JSON.stringify({ error: error.message });
  }

  // Summarize
  const updates = data || [];
  const statusCounts: Record<string, number> = {};
  for (const u of updates) {
    statusCounts[u.status] = (statusCounts[u.status] || 0) + 1;
  }

  return JSON.stringify({
    total: updates.length,
    status_breakdown: statusCounts,
    updates,
  });
};
