import type { Tool } from "@anthropic-ai/sdk/resources/messages";
import type { ToolContext, ToolExecutor } from "./types";

export const getWireStatusDefinition: Tool = {
  name: "get_wire_status",
  description:
    "Get wire transfer status and collection progress for a deal. Shows which LPs have wired, partial wires, and pending amounts.",
  input_schema: {
    type: "object" as const,
    properties: {
      deal_name: {
        type: "string",
        description: "Deal name",
      },
      deal_id: {
        type: "string",
        description: "Deal UUID",
      },
      wire_status: {
        type: "string",
        enum: ["pending", "partial", "complete"],
        description: "Filter by wire status",
      },
    },
  },
};

export const executeGetWireStatus: ToolExecutor = async (
  input: Record<string, unknown>,
  ctx: ToolContext
): Promise<string> => {
  const { deal_name, deal_id, wire_status } = input;

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
    .from("deal_lp_relationships")
    .select(
      `lp_contact_id, status, committed_amount, allocated_amount,
       wire_status, wire_amount_received, wire_received_at,
       lp_contacts!inner(id, name, firm, email)`
    )
    .in("status", ["committed", "allocated"]);

  if (resolvedDealId) {
    query = query.eq("deal_id", resolvedDealId);
  }

  if (wire_status && typeof wire_status === "string") {
    query = query.eq("wire_status", wire_status);
  }

  const { data, error } = await query;

  if (error) {
    return JSON.stringify({ error: error.message });
  }

  const results = data || [];
  const totalExpected = results.reduce(
    (sum, r) => sum + (Number(r.committed_amount) || 0),
    0
  );
  const totalReceived = results.reduce(
    (sum, r) => sum + (Number(r.wire_amount_received) || 0),
    0
  );
  const totalOutstanding = totalExpected - totalReceived;

  return JSON.stringify({
    total: results.length,
    summary: {
      total_expected: totalExpected,
      total_received: totalReceived,
      total_outstanding: totalOutstanding,
      collection_rate_percent:
        totalExpected > 0
          ? Math.round((totalReceived / totalExpected) * 1000) / 10
          : 0,
    },
    wires: results,
  });
};
