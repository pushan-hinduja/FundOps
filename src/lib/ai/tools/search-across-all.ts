import type { Tool } from "@anthropic-ai/sdk/resources/messages";
import type { ToolContext, ToolExecutor } from "./types";

export const searchAcrossAllDefinition: Tool = {
  name: "search_across_all",
  description:
    "Broad search across LPs, deals, and emails for vague or general questions. Use this when the user's query doesn't clearly map to a specific entity type, or when you need to find anything related to a keyword.",
  input_schema: {
    type: "object" as const,
    properties: {
      query: {
        type: "string",
        description: "Search term to look for across all entities",
      },
    },
    required: ["query"],
  },
};

export const executeSearchAcrossAll: ToolExecutor = async (
  input: Record<string, unknown>,
  ctx: ToolContext
): Promise<string> => {
  const query = input.query as string;
  if (!query) {
    return JSON.stringify({ error: "query is required" });
  }

  const pattern = `%${query}%`;

  // Run all three searches in parallel
  const [lpsResult, dealsResult, emailsResult] = await Promise.all([
    ctx.supabase
      .from("lp_contacts")
      .select("id, name, email, firm, investor_type, total_commitments, last_interaction_at")
      .eq("organization_id", ctx.organizationId)
      .or(`name.ilike.${pattern},firm.ilike.${pattern},email.ilike.${pattern}`)
      .limit(10),

    ctx.supabase
      .from("deals")
      .select("id, name, company_name, status, target_raise, total_committed, close_date")
      .eq("organization_id", ctx.organizationId)
      .or(`name.ilike.${pattern},company_name.ilike.${pattern}`)
      .limit(10),

    ctx.supabase
      .from("emails_raw")
      .select("id, from_email, from_name, subject, received_at")
      .eq("organization_id", ctx.organizationId)
      .or(`subject.ilike.${pattern},from_name.ilike.${pattern},from_email.ilike.${pattern}`)
      .order("received_at", { ascending: false })
      .limit(10),
  ]);

  return JSON.stringify({
    lps: {
      total: lpsResult.data?.length ?? 0,
      results: lpsResult.data ?? [],
      error: lpsResult.error?.message,
    },
    deals: {
      total: dealsResult.data?.length ?? 0,
      results: dealsResult.data ?? [],
      error: dealsResult.error?.message,
    },
    emails: {
      total: emailsResult.data?.length ?? 0,
      results: emailsResult.data ?? [],
      error: emailsResult.error?.message,
    },
  });
};
