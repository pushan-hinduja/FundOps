import type { Tool } from "@anthropic-ai/sdk/resources/messages";
import type { ToolContext, ToolExecutor } from "./types";

export const queryLpsDefinition: Tool = {
  name: "query_lps",
  description:
    "Search and filter LP (Limited Partner) contacts. Use this to find LPs by name, firm, investor type, accreditation status, check size range, or tags. Returns contact details, investment preferences, and engagement metrics.",
  input_schema: {
    type: "object" as const,
    properties: {
      search_term: {
        type: "string",
        description: "Free-text search matching LP name, firm, or email",
      },
      investor_type: {
        type: "string",
        enum: [
          "individual",
          "institution",
          "family_office",
          "fund_of_funds",
          "endowment",
          "pension",
          "sovereign_wealth",
        ],
        description: "Filter by investor type",
      },
      accreditation_status: {
        type: "string",
        enum: [
          "accredited_investor",
          "qualified_purchaser",
          "qualified_client",
          "non_accredited",
        ],
        description: "Filter by accreditation status",
      },
      min_check_size: {
        type: "number",
        description: "Minimum preferred check size in USD",
      },
      max_check_size: {
        type: "number",
        description: "Maximum preferred check size in USD",
      },
      tags: {
        type: "array",
        items: { type: "string" },
        description: "Filter by tags",
      },
      sort_by: {
        type: "string",
        enum: [
          "name",
          "total_commitments",
          "last_interaction_at",
          "participation_rate",
        ],
        description: "Sort results by this field",
      },
      limit: {
        type: "integer",
        description: "Maximum number of results to return (default 20, max 50)",
      },
    },
  },
};

export const executeQueryLps: ToolExecutor = async (
  input: Record<string, unknown>,
  ctx: ToolContext
): Promise<string> => {
  const {
    search_term,
    investor_type,
    accreditation_status,
    min_check_size,
    max_check_size,
    tags,
    sort_by,
    limit: rawLimit,
  } = input;

  const limit = Math.min(Number(rawLimit) || 20, 50);

  let query = ctx.supabase
    .from("lp_contacts")
    .select(
      "id, name, email, firm, title, investor_type, accreditation_status, preferred_check_size, total_commitments, participation_rate, last_interaction_at, tags, notes"
    )
    .eq("organization_id", ctx.organizationId);

  if (search_term && typeof search_term === "string") {
    query = query.or(
      `name.ilike.%${search_term}%,firm.ilike.%${search_term}%,email.ilike.%${search_term}%`
    );
  }

  if (investor_type && typeof investor_type === "string") {
    query = query.eq("investor_type", investor_type);
  }

  if (accreditation_status && typeof accreditation_status === "string") {
    query = query.eq("accreditation_status", accreditation_status);
  }

  if (min_check_size && typeof min_check_size === "number") {
    query = query.gte("preferred_check_size", min_check_size);
  }

  if (max_check_size && typeof max_check_size === "number") {
    query = query.lte("preferred_check_size", max_check_size);
  }

  if (tags && Array.isArray(tags) && tags.length > 0) {
    query = query.contains("tags", tags);
  }

  const sortField =
    typeof sort_by === "string" ? sort_by : "name";
  const ascending = sortField === "name";
  query = query.order(sortField, { ascending }).limit(limit);

  const { data, error } = await query;

  if (error) {
    return JSON.stringify({ error: error.message });
  }

  return JSON.stringify({
    total: data?.length ?? 0,
    lps: data ?? [],
  });
};
