import type { Tool } from "@anthropic-ai/sdk/resources/messages";
import type { ToolContext, ToolExecutor } from "./types";
import { getAnthropicClient, AGENT_MODEL_ID } from "../anthropic";

export const draftEmailDefinition: Tool = {
  name: "draft_email",
  description:
    "Draft an email to an LP about a specific deal. Does NOT send the email — returns the draft for the user to review. Uses deal context, LP relationship details, and the specified tone.",
  input_schema: {
    type: "object" as const,
    properties: {
      lp_name: {
        type: "string",
        description: "Name of the LP recipient",
      },
      lp_email: {
        type: "string",
        description: "Email address of the LP (optional, will look up from name)",
      },
      deal_name: {
        type: "string",
        description: "Deal to reference in the email",
      },
      purpose: {
        type: "string",
        enum: [
          "initial_outreach",
          "follow_up",
          "commitment_confirmation",
          "wire_instructions",
          "update",
          "custom",
        ],
        description: "Purpose of the email",
      },
      custom_instructions: {
        type: "string",
        description: "Additional instructions for what the email should say",
      },
      tone: {
        type: "string",
        enum: ["professional", "friendly", "formal", "concise"],
        description: "Tone for the email (default: user's preference from settings)",
      },
    },
    required: ["lp_name", "deal_name", "purpose"],
  },
};

export const executeDraftEmail: ToolExecutor = async (
  input: Record<string, unknown>,
  ctx: ToolContext
): Promise<string> => {
  const {
    lp_name,
    lp_email: inputLpEmail,
    deal_name,
    purpose,
    custom_instructions,
    tone: inputTone,
  } = input;

  // Look up LP
  let lp = null;
  if (inputLpEmail && typeof inputLpEmail === "string") {
    const { data } = await ctx.supabase
      .from("lp_contacts")
      .select("id, name, email, firm, title")
      .eq("organization_id", ctx.organizationId)
      .eq("email", inputLpEmail)
      .limit(1);
    lp = data?.[0] ?? null;
  }
  if (!lp && lp_name && typeof lp_name === "string") {
    const { data } = await ctx.supabase
      .from("lp_contacts")
      .select("id, name, email, firm, title")
      .eq("organization_id", ctx.organizationId)
      .ilike("name", `%${lp_name}%`)
      .limit(1);
    lp = data?.[0] ?? null;
  }

  // Look up deal
  let deal = null;
  if (deal_name && typeof deal_name === "string") {
    const { data } = await ctx.supabase
      .from("deals")
      .select(
        "id, name, company_name, target_raise, total_committed, status, close_date, fee_percent, carry_percent, investment_stage, memo_url"
      )
      .eq("organization_id", ctx.organizationId)
      .ilike("name", `%${deal_name}%`)
      .limit(1);
    deal = data?.[0] ?? null;
  }

  if (!deal) {
    return JSON.stringify({ error: `No deal found matching "${deal_name}"` });
  }

  // Look up LP-deal relationship if LP found
  let relationship = null;
  if (lp && deal) {
    const { data } = await ctx.supabase
      .from("deal_lp_relationships")
      .select(
        "status, committed_amount, allocated_amount, wire_status, management_fee_percent, carry_percent, side_letter_terms, has_mfn_rights, has_coinvest_rights"
      )
      .eq("deal_id", deal.id)
      .eq("lp_contact_id", lp.id)
      .limit(1);
    relationship = data?.[0] ?? null;
  }

  // Get user's preferred tone if not specified
  let tone = typeof inputTone === "string" ? inputTone : null;
  if (!tone) {
    const { data: settings } = await ctx.supabase
      .from("user_settings")
      .select("settings")
      .eq("user_id", ctx.userId)
      .limit(1);
    tone =
      (settings?.[0]?.settings as Record<string, unknown>)?.ai_response_tone as string ??
      "professional";
  }

  // Get user info for signature
  const { data: userData } = await ctx.supabase
    .from("users")
    .select("name, email")
    .eq("id", ctx.userId)
    .limit(1);
  const userName = userData?.[0]?.name ?? "the team";

  // Build prompt for email drafting
  const contextParts: string[] = [];

  contextParts.push(`Deal: ${deal.name} (${deal.company_name || "N/A"})`);
  contextParts.push(`Status: ${deal.status}`);
  if (deal.target_raise) contextParts.push(`Target Raise: $${deal.target_raise}`);
  if (deal.total_committed) contextParts.push(`Total Committed: $${deal.total_committed}`);
  if (deal.close_date) contextParts.push(`Close Date: ${deal.close_date}`);
  if (deal.fee_percent) contextParts.push(`Management Fee: ${deal.fee_percent}%`);
  if (deal.carry_percent) contextParts.push(`Carry: ${deal.carry_percent}%`);
  if (deal.investment_stage) contextParts.push(`Stage: ${deal.investment_stage}`);

  if (lp) {
    contextParts.push(`\nLP: ${lp.name}${lp.firm ? ` (${lp.firm})` : ""}`);
    if (lp.title) contextParts.push(`Title: ${lp.title}`);
  }

  if (relationship) {
    contextParts.push(`\nLP-Deal Status: ${relationship.status}`);
    if (relationship.committed_amount)
      contextParts.push(`Committed: $${relationship.committed_amount}`);
    if (relationship.wire_status)
      contextParts.push(`Wire Status: ${relationship.wire_status}`);
    if (relationship.side_letter_terms)
      contextParts.push(`Side Letter: ${relationship.side_letter_terms}`);
  }

  const purposeLabels: Record<string, string> = {
    initial_outreach: "Initial outreach to introduce the deal opportunity",
    follow_up: "Follow-up on a previous conversation or outreach",
    commitment_confirmation: "Confirm and thank for their commitment",
    wire_instructions: "Provide wire transfer instructions",
    update: "Share a deal update or progress report",
    custom: "Custom email",
  };

  const prompt = `Draft an email to ${lp?.name || lp_name} about the ${deal.name} deal.

Purpose: ${purposeLabels[purpose as string] || purpose}
Tone: ${tone}
${custom_instructions ? `Additional instructions: ${custom_instructions}` : ""}

Context:
${contextParts.join("\n")}

Guidelines:
- Keep it concise and ${tone}
- Do not include a subject line (just the body)
- Sign off as "${userName}"
- Reference specific deal details when relevant
- Do not make up information not provided in the context`;

  try {
    const client = getAnthropicClient();
    const response = await client.messages.create({
      model: AGENT_MODEL_ID,
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const draft = textBlock
      ? (textBlock as { type: "text"; text: string }).text
      : "Failed to generate draft.";

    return JSON.stringify({
      draft,
      metadata: {
        lp_name: lp?.name || lp_name,
        lp_email: lp?.email || inputLpEmail || null,
        deal_name: deal.name,
        purpose,
        tone,
      },
    });
  } catch (err) {
    return JSON.stringify({
      error: `Failed to generate email draft: ${err instanceof Error ? err.message : "Unknown error"}`,
    });
  }
};
