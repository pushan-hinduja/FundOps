import type { Tool } from "@anthropic-ai/sdk/resources/messages";
import type { ToolContext, ToolExecutor } from "./types";

export const getEmailHistoryDefinition: Tool = {
  name: "get_email_history",
  description:
    "Get recent email interactions for an LP or related to a deal. Returns email subjects, parsed intent/sentiment, extracted questions, and whether questions have been answered.",
  input_schema: {
    type: "object" as const,
    properties: {
      lp_email: {
        type: "string",
        description: "LP email address to search for",
      },
      lp_name: {
        type: "string",
        description:
          "LP name to search for (will look up their email first)",
      },
      deal_id: {
        type: "string",
        description: "Filter to emails related to a specific deal",
      },
      intent_filter: {
        type: "string",
        enum: ["interested", "committed", "declined", "question"],
        description: "Filter by parsed intent",
      },
      days_back: {
        type: "integer",
        description: "Number of days back to search (default 30, max 90)",
      },
      limit: {
        type: "integer",
        description: "Maximum emails to return (default 10, max 30)",
      },
    },
  },
};

export const executeGetEmailHistory: ToolExecutor = async (
  input: Record<string, unknown>,
  ctx: ToolContext
): Promise<string> => {
  const { lp_email, lp_name, deal_id, intent_filter, days_back, limit: rawLimit } = input;

  const limit = Math.min(Number(rawLimit) || 10, 30);
  const daysBack = Math.min(Number(days_back) || 30, 90);

  // Resolve LP email from name if needed
  let resolvedEmail = typeof lp_email === "string" ? lp_email : null;
  if (!resolvedEmail && lp_name && typeof lp_name === "string") {
    const { data: lps } = await ctx.supabase
      .from("lp_contacts")
      .select("email")
      .eq("organization_id", ctx.organizationId)
      .ilike("name", `%${lp_name}%`)
      .limit(1);
    resolvedEmail = lps?.[0]?.email ?? null;
    if (!resolvedEmail) {
      return JSON.stringify({ error: `No LP found matching "${lp_name}"` });
    }
  }

  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - daysBack);

  let query = ctx.supabase
    .from("emails_raw")
    .select(
      `id, from_email, from_name, to_emails, subject, received_at,
       emails_parsed(
         detected_lp_id, detected_deal_id, intent, commitment_amount,
         sentiment, extracted_questions, is_answered, confidence_scores
       )`
    )
    .eq("organization_id", ctx.organizationId)
    .gte("received_at", sinceDate.toISOString())
    .order("received_at", { ascending: false })
    .limit(limit);

  if (resolvedEmail) {
    query = query.or(
      `from_email.eq.${resolvedEmail},to_emails.cs.{${resolvedEmail}}`
    );
  }

  const { data: emails, error } = await query;

  if (error) {
    return JSON.stringify({ error: error.message });
  }

  let results = emails || [];

  // Post-filter by deal_id and intent if needed (these are on the parsed relation)
  if (deal_id && typeof deal_id === "string") {
    results = results.filter((e) => {
      const parsed = e.emails_parsed as Record<string, unknown> | Record<string, unknown>[] | null;
      if (Array.isArray(parsed)) {
        return parsed.some((p) => p.detected_deal_id === deal_id);
      }
      return parsed?.detected_deal_id === deal_id;
    });
  }

  if (intent_filter && typeof intent_filter === "string") {
    results = results.filter((e) => {
      const parsed = e.emails_parsed as Record<string, unknown> | Record<string, unknown>[] | null;
      if (Array.isArray(parsed)) {
        return parsed.some((p) => p.intent === intent_filter);
      }
      return parsed?.intent === intent_filter;
    });
  }

  return JSON.stringify({
    total: results.length,
    emails: results,
  });
};
