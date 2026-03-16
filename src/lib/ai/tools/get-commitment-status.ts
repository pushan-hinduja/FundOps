import type { Tool } from "@anthropic-ai/sdk/resources/messages";
import type { ToolContext, ToolExecutor } from "./types";

export const getCommitmentStatusDefinition: Tool = {
  name: "get_commitment_status",
  description:
    "Get detailed commitment and wire status for LP-deal relationships. Shows who has committed, their amounts, allocation status, wire transfer progress, and any special terms (side letters, MFN rights, co-invest rights).",
  input_schema: {
    type: "object" as const,
    properties: {
      deal_name: {
        type: "string",
        description: "Deal name to check commitments for",
      },
      deal_id: {
        type: "string",
        description: "Exact deal UUID",
      },
      lp_name: {
        type: "string",
        description: "Filter to a specific LP by name",
      },
      lp_id: {
        type: "string",
        description: "Filter to a specific LP by UUID",
      },
      status_filter: {
        type: "string",
        enum: ["contacted", "interested", "committed", "allocated", "declined"],
        description: "Filter relationships by status",
      },
      wire_status_filter: {
        type: "string",
        enum: ["pending", "partial", "complete"],
        description: "Filter by wire transfer status",
      },
    },
  },
};

export const executeGetCommitmentStatus: ToolExecutor = async (
  input: Record<string, unknown>,
  ctx: ToolContext
): Promise<string> => {
  const { deal_name, deal_id, lp_name, lp_id, status_filter, wire_status_filter } = input;

  // If deal_name provided, look up deal ID first
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

  // If lp_name provided, look up LP ID
  let resolvedLpId = typeof lp_id === "string" ? lp_id : null;
  if (!resolvedLpId && lp_name && typeof lp_name === "string") {
    const { data: lps } = await ctx.supabase
      .from("lp_contacts")
      .select("id")
      .eq("organization_id", ctx.organizationId)
      .ilike("name", `%${lp_name}%`)
      .limit(1);
    resolvedLpId = lps?.[0]?.id ?? null;
    if (!resolvedLpId) {
      return JSON.stringify({ error: `No LP found matching "${lp_name}"` });
    }
  }

  let query = ctx.supabase
    .from("deal_lp_relationships")
    .select(
      `id, deal_id, lp_contact_id, status, committed_amount, allocated_amount, reserved_amount,
       management_fee_percent, carry_percent, minimum_commitment, side_letter_terms,
       has_mfn_rights, has_coinvest_rights, reporting_frequency,
       wire_status, wire_amount_received, wire_received_at,
       first_contact_at, latest_response_at, response_time_hours, close_date, notes,
       deals!inner(id, name, status, organization_id),
       lp_contacts!inner(id, name, firm, email)`
    )
    .eq("deals.organization_id", ctx.organizationId);

  if (resolvedDealId) {
    query = query.eq("deal_id", resolvedDealId);
  }

  if (resolvedLpId) {
    query = query.eq("lp_contact_id", resolvedLpId);
  }

  if (status_filter && typeof status_filter === "string") {
    query = query.eq("status", status_filter);
  }

  if (wire_status_filter && typeof wire_status_filter === "string") {
    query = query.eq("wire_status", wire_status_filter);
  }

  const { data, error } = await query;

  if (error) {
    return JSON.stringify({ error: error.message });
  }

  // Compute summary
  const totalCommitted = (data || []).reduce(
    (sum, r) => sum + (Number(r.committed_amount) || 0),
    0
  );
  const totalAllocated = (data || []).reduce(
    (sum, r) => sum + (Number(r.allocated_amount) || 0),
    0
  );
  const totalWired = (data || []).reduce(
    (sum, r) => sum + (Number(r.wire_amount_received) || 0),
    0
  );

  return JSON.stringify({
    total: data?.length ?? 0,
    summary: {
      total_committed: totalCommitted,
      total_allocated: totalAllocated,
      total_wired: totalWired,
    },
    relationships: data ?? [],
  });
};
