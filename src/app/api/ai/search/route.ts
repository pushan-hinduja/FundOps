import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnthropicClient, SONNET_MODEL_ID } from "@/lib/ai/anthropic";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const { query, conversationHistory = [] } = await request.json();

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    // Get Supabase client and user
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's organization
    const { data: userData } = await supabase
      .from("users")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (!userData?.organization_id) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Fetch relevant data from Supabase to provide context
    const [dealsResult, lpsResult, relationshipsResult, orgResult] = await Promise.all([
      supabase
        .from("deals")
        .select("*")
        .eq("organization_id", userData.organization_id),
      supabase
        .from("lp_contacts")
        .select("*")
        .eq("organization_id", userData.organization_id),
      supabase
        .from("deal_lp_relationships")
        .select("*, deals!inner(name, status, organization_id), lp_contacts!inner(name, firm)")
        .eq("deals.organization_id", userData.organization_id),
      supabase
        .from("organizations")
        .select("name")
        .eq("id", userData.organization_id)
        .single(),
    ]);

    const deals = dealsResult.data || [];
    const lps = lpsResult.data || [];
    const relationships = relationshipsResult.data || [];
    const orgName = orgResult.data?.name || "Unknown Organization";

    // Build context for the AI
    const context = buildContext(orgName, deals, lps, relationships);

    // Build messages for the API
    const client = getAnthropicClient();
    const messages: { role: "user" | "assistant"; content: string }[] = [];

    // Add conversation history
    for (const msg of conversationHistory as Message[]) {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }

    // Add current query
    messages.push({
      role: "user",
      content: query,
    });

    // Call Anthropic API
    const response = await client.messages.create({
      model: SONNET_MODEL_ID,
      max_tokens: 1024,
      system: `You are an AI assistant for FundOps, a fund operations platform. You help users understand their deals, LP (Limited Partner) contacts, and pipeline data.

Here is the current data context for ${orgName}:

${context}

Answer questions concisely and helpfully based on this data. If asked about specific deals or LPs, provide relevant details. Format numbers nicely (e.g., $1.5M instead of 1500000). Be conversational but professional.`,
      messages,
    });

    // Extract text response
    const textContent = response.content.find((block) => block.type === "text");
    const aiResponse = textContent
      ? (textContent as { type: "text"; text: string }).text
      : "I apologize, but I couldn't generate a response.";

    return NextResponse.json({ response: aiResponse });
  } catch (error) {
    console.error("AI Search error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}

function buildContext(
  orgName: string,
  deals: Record<string, unknown>[],
  lps: Record<string, unknown>[],
  relationships: Record<string, unknown>[]
): string {
  const activeDeals = deals.filter(
    (d: Record<string, unknown>) => d.status === "active"
  );
  const totalCommitted = deals.reduce(
    (sum: number, d: Record<string, unknown>) =>
      sum + ((d.total_committed as number) || 0),
    0
  );
  const totalInterested = deals.reduce(
    (sum: number, d: Record<string, unknown>) =>
      sum + ((d.total_interested as number) || 0),
    0
  );
  const totalTarget = deals.reduce(
    (sum: number, d: Record<string, unknown>) =>
      sum + ((d.target_raise as number) || 0),
    0
  );

  let context = `Organization: ${orgName}

SUMMARY:
- Total Deals: ${deals.length}
- Active Deals: ${activeDeals.length}
- Total LP Contacts: ${lps.length}
- Total Committed: $${formatNumber(totalCommitted)}
- Total Interested: $${formatNumber(totalInterested)}
- Total Target Raise: $${formatNumber(totalTarget)}
- Overall Progress: ${totalTarget > 0 ? Math.round((totalCommitted / totalTarget) * 100) : 0}%

DEALS:
`;

  for (const deal of deals) {
    context += `- ${deal.name} (${deal.status}): Target $${formatNumber(deal.target_raise as number)}, Committed $${formatNumber(deal.total_committed as number)}, Interested $${formatNumber(deal.total_interested as number)}`;
    if (deal.close_date) context += `, Close: ${deal.close_date}`;
    if (deal.investment_stage) context += `, Stage: ${deal.investment_stage}`;
    context += `\n`;
  }

  context += `
LP CONTACTS (${lps.length} total):
`;

  for (const lp of lps) {
    context += `- ${lp.name}`;
    if (lp.firm) context += ` (${lp.firm})`;
    if (lp.kyc_status) context += ` [KYC: ${lp.kyc_status}]`;
    context += `\n`;
  }

  // Group relationships by deal for active deals
  const relsByDeal: Record<string, Record<string, unknown>[]> = {};
  for (const rel of relationships) {
    const dealId = rel.deal_id as string;
    if (!relsByDeal[dealId]) relsByDeal[dealId] = [];
    relsByDeal[dealId].push(rel);
  }

  // Only include detailed LP breakdown for active deals to keep context manageable
  const activeRelDeals = activeDeals.map((d) => d.id as string);
  if (activeRelDeals.length > 0) {
    context += `\nACTIVE DEAL LP DETAILS:\n`;
    for (const dealId of activeRelDeals) {
      const deal = deals.find((d) => d.id === dealId);
      const rels = relsByDeal[dealId] || [];
      if (!deal || rels.length === 0) continue;

      context += `\n${deal.name}:\n`;
      for (const rel of rels) {
        const lpInfo = rel.lp_contacts as Record<string, unknown> | null;
        const lpName = lpInfo?.name || "Unknown LP";
        const lpFirm = lpInfo?.firm ? ` (${lpInfo.firm})` : "";
        context += `  - ${lpName}${lpFirm}: Status=${rel.status}, Committed=$${formatNumber(rel.committed_amount as number)}`;
        if (rel.allocated_amount) context += `, Allocated=$${formatNumber(rel.allocated_amount as number)}`;
        if (rel.wire_status) context += `, Wire=${rel.wire_status}`;
        if (rel.wire_amount_received) context += `, Received=$${formatNumber(rel.wire_amount_received as number)}`;
        context += `\n`;
      }
    }
  }

  // Add summary counts for wire status across active deals
  const activeRels = relationships.filter((r) => {
    const dealInfo = r.deals as Record<string, unknown> | null;
    return dealInfo?.status === "active";
  });
  const pendingWires = activeRels.filter((r) => r.wire_status === "pending").length;
  const partialWires = activeRels.filter((r) => r.wire_status === "partial").length;
  const completeWires = activeRels.filter((r) => r.wire_status === "complete").length;
  const interestedLPs = activeRels.filter((r) => r.status === "interested").length;
  const committedLPs = activeRels.filter((r) => r.status === "committed").length;
  const allocatedLPs = activeRels.filter((r) => r.status === "allocated").length;

  if (activeRels.length > 0) {
    context += `\nACTIVE DEALS SUMMARY:
- LPs Interested: ${interestedLPs}
- LPs Committed: ${committedLPs}
- LPs Allocated: ${allocatedLPs}
- Wires Pending: ${pendingWires}
- Wires Partial: ${partialWires}
- Wires Complete: ${completeWires}
`;
  }

  return context;
}

function formatNumber(num: number): string {
  if (!num) return "0";
  if (num >= 1000000000) return `${(num / 1000000000).toFixed(1)}B`;
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

function generateMockResponse(
  query: string,
  deals: Record<string, unknown>[],
  lps: Record<string, unknown>[]
): string {
  const lowerQuery = query.toLowerCase();

  if (lowerQuery.includes("committed") || lowerQuery.includes("lp")) {
    const totalCommitted = deals.reduce(
      (sum: number, d: Record<string, unknown>) =>
        sum + ((d.total_committed as number) || 0),
      0
    );
    return `You have ${lps.length} LP contacts in your database. Your total committed amount across all deals is $${formatNumber(totalCommitted)}.`;
  }

  if (lowerQuery.includes("pipeline") || lowerQuery.includes("interested")) {
    const totalInterested = deals.reduce(
      (sum: number, d: Record<string, unknown>) =>
        sum + ((d.total_interested as number) || 0),
      0
    );
    return `Your current pipeline value (interested LPs) is $${formatNumber(totalInterested)} across ${deals.length} deals.`;
  }

  if (lowerQuery.includes("active") || lowerQuery.includes("deal")) {
    const activeDeals = deals.filter(
      (d: Record<string, unknown>) => d.status === "active"
    );
    return `You have ${activeDeals.length} active deals out of ${deals.length} total deals.`;
  }

  return `Based on your data: You have ${deals.length} deals and ${lps.length} LP contacts. What specific information would you like to know?`;
}
