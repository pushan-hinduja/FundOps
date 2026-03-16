import type { Tool } from "@anthropic-ai/sdk/resources/messages";
import type { ToolContext, ToolExecutor } from "./types";

export const getDealPipelineDefinition: Tool = {
  name: "get_deal_pipeline",
  description:
    "Get deal information and full LP pipeline breakdown. Can retrieve a specific deal by name/ID, or all deals filtered by status. Returns deal details (target raise, committed, close date, terms) and optionally per-LP pipeline status.",
  input_schema: {
    type: "object" as const,
    properties: {
      deal_name: {
        type: "string",
        description: "Deal name or partial name to search for",
      },
      deal_id: {
        type: "string",
        description: "Exact deal UUID",
      },
      status_filter: {
        type: "string",
        enum: ["draft", "active", "closed", "cancelled"],
        description: "Filter deals by status (default: all)",
      },
      include_lp_breakdown: {
        type: "boolean",
        description: "Include per-LP relationship details (default true)",
      },
    },
  },
};

export const executeGetDealPipeline: ToolExecutor = async (
  input: Record<string, unknown>,
  ctx: ToolContext
): Promise<string> => {
  const { deal_name, deal_id, status_filter, include_lp_breakdown } = input;
  const includeLps = include_lp_breakdown !== false;

  let dealsQuery = ctx.supabase
    .from("deals")
    .select(
      "id, name, company_name, description, target_raise, min_check_size, max_check_size, status, total_committed, total_interested, fee_percent, carry_percent, close_date, investment_stage, investment_type, memo_url, deadline, investor_update_frequency"
    )
    .eq("organization_id", ctx.organizationId);

  if (deal_id && typeof deal_id === "string") {
    dealsQuery = dealsQuery.eq("id", deal_id);
  } else if (deal_name && typeof deal_name === "string") {
    dealsQuery = dealsQuery.ilike("name", `%${deal_name}%`);
  }

  if (status_filter && typeof status_filter === "string") {
    dealsQuery = dealsQuery.eq("status", status_filter);
  }

  dealsQuery = dealsQuery.order("created_at", { ascending: false });

  const { data: deals, error: dealsError } = await dealsQuery;

  if (dealsError) {
    return JSON.stringify({ error: dealsError.message });
  }

  if (!deals || deals.length === 0) {
    return JSON.stringify({ total: 0, deals: [] });
  }

  if (!includeLps) {
    return JSON.stringify({ total: deals.length, deals });
  }

  const dealIds = deals.map((d) => d.id);
  const { data: relationships, error: relsError } = await ctx.supabase
    .from("deal_lp_relationships")
    .select(
      "deal_id, lp_contact_id, status, committed_amount, allocated_amount, wire_status, wire_amount_received, first_contact_at, latest_response_at, notes, lp_contacts(id, name, firm, email)"
    )
    .in("deal_id", dealIds);

  if (relsError) {
    return JSON.stringify({
      total: deals.length,
      deals,
      lp_breakdown_error: relsError.message,
    });
  }

  const relsByDeal: Record<string, typeof relationships> = {};
  for (const rel of relationships || []) {
    const did = rel.deal_id as string;
    if (!relsByDeal[did]) relsByDeal[did] = [];
    relsByDeal[did].push(rel);
  }

  const dealsWithLps = deals.map((deal) => ({
    ...deal,
    lp_relationships: relsByDeal[deal.id] || [],
  }));

  return JSON.stringify({ total: deals.length, deals: dealsWithLps });
};
