import type { Tool } from "@anthropic-ai/sdk/resources/messages";
import type { ToolContext, ToolExecutor } from "./types";

export const getDealPipelineDefinition: Tool = {
  name: "get_deal_pipeline",
  description:
    "Get deal information, deal notes (valuation, financials, team notes, votes), and full LP pipeline breakdown. Can retrieve a specific deal by name/ID, or all deals filtered by status. Returns deal details (target raise, committed, close date, terms), deal notes data (valuation, round size, revenue, EBITDA, profitability, team notes), team votes with comments, timeline notes, and optionally per-LP pipeline status.",
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
        enum: ["draft", "active", "closed", "archived"],
        description: "Filter deals by status (default: all)",
      },
      include_lp_breakdown: {
        type: "boolean",
        description: "Include per-LP relationship details (default true)",
      },
      include_deal_notes: {
        type: "boolean",
        description: "Include deal notes data: draft financials (valuation, round size, revenue, EBITDA), team votes, and timeline notes (default true)",
      },
    },
  },
};

export const executeGetDealPipeline: ToolExecutor = async (
  input: Record<string, unknown>,
  ctx: ToolContext
): Promise<string> => {
  const { deal_name, deal_id, status_filter, include_lp_breakdown, include_deal_notes } = input;
  const includeLps = include_lp_breakdown !== false;
  const includeNotes = include_deal_notes !== false;

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

  const dealIds = deals.map((d) => d.id);

  // Fetch LP relationships if requested
  let relsByDeal: Record<string, any[]> = {};
  if (includeLps) {
    const { data: relationships, error: relsError } = await ctx.supabase
      .from("deal_lp_relationships")
      .select(
        "deal_id, lp_contact_id, status, committed_amount, allocated_amount, wire_status, wire_amount_received, first_contact_at, latest_response_at, notes, lp_contacts(id, name, firm, email)"
      )
      .in("deal_id", dealIds);

    if (!relsError && relationships) {
      for (const rel of relationships) {
        const did = rel.deal_id as string;
        if (!relsByDeal[did]) relsByDeal[did] = [];
        relsByDeal[did].push(rel);
      }
    }
  }

  // Fetch deal notes data if requested (draft financials, votes, timeline notes)
  let draftDataByDeal: Record<string, any> = {};
  let votesByDeal: Record<string, any[]> = {};
  let notesByDeal: Record<string, any[]> = {};

  if (includeNotes) {
    // Draft financial data (valuation, round size, revenue, etc.)
    const { data: draftData } = await ctx.supabase
      .from("deal_draft_data")
      .select("deal_id, valuation, round_size, revenue_current_year, revenue_previous_year, yoy_growth, ebitda, is_profitable, team_notes")
      .in("deal_id", dealIds);

    if (draftData) {
      for (const d of draftData) {
        draftDataByDeal[d.deal_id] = d;
      }
    }

    // Team votes with user info
    const { data: votes } = await ctx.supabase
      .from("deal_votes")
      .select("deal_id, vote, comment, users(id, name, email)")
      .in("deal_id", dealIds);

    if (votes) {
      for (const v of votes) {
        const did = v.deal_id as string;
        if (!votesByDeal[did]) votesByDeal[did] = [];
        votesByDeal[did].push({
          voter: (v as any).users?.name || (v as any).users?.email || "Unknown",
          vote: v.vote,
          comment: v.comment,
        });
      }
    }

    // Timeline notes with user info
    const { data: notes } = await ctx.supabase
      .from("deal_notes")
      .select("deal_id, content, created_at, users(id, name, email)")
      .in("deal_id", dealIds)
      .order("created_at", { ascending: false });

    if (notes) {
      for (const n of notes) {
        const did = n.deal_id as string;
        if (!notesByDeal[did]) notesByDeal[did] = [];
        notesByDeal[did].push({
          author: (n as any).users?.name || (n as any).users?.email || "Unknown",
          content: n.content,
          created_at: n.created_at,
        });
      }
    }
  }

  // Assemble response
  const dealsWithData = deals.map((deal) => {
    const result: any = { ...deal };

    if (includeLps) {
      result.lp_relationships = relsByDeal[deal.id] || [];
    }

    if (includeNotes) {
      const draft = draftDataByDeal[deal.id];
      if (draft) {
        result.deal_notes_data = {
          valuation: draft.valuation,
          round_size: draft.round_size,
          revenue_current_year: draft.revenue_current_year,
          revenue_previous_year: draft.revenue_previous_year,
          yoy_growth: draft.yoy_growth,
          ebitda: draft.ebitda,
          is_profitable: draft.is_profitable,
          team_notes: draft.team_notes,
        };
      }

      const votes = votesByDeal[deal.id];
      if (votes && votes.length > 0) {
        result.team_votes = votes;
      }

      const notes = notesByDeal[deal.id];
      if (notes && notes.length > 0) {
        result.timeline_notes = notes;
      }
    }

    return result;
  });

  return JSON.stringify({ total: deals.length, deals: dealsWithData });
};
