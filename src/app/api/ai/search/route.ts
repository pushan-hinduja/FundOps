import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";

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
    const [dealsResult, lpsResult, orgResult] = await Promise.all([
      supabase
        .from("deals")
        .select("*")
        .eq("organization_id", userData.organization_id),
      supabase
        .from("lp_contacts")
        .select("*")
        .eq("organization_id", userData.organization_id),
      supabase
        .from("organizations")
        .select("name")
        .eq("id", userData.organization_id)
        .single(),
    ]);

    const deals = dealsResult.data || [];
    const lps = lpsResult.data || [];
    const orgName = orgResult.data?.name || "Unknown Organization";

    // Build context for the AI
    const context = buildContext(orgName, deals, lps);

    // Check if Anthropic API key is available
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      // Fallback to mock response if no API key
      return NextResponse.json({
        response: generateMockResponse(query, deals, lps),
      });
    }

    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey,
    });

    // Build messages for the API
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
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
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
  lps: Record<string, unknown>[]
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
    context += `- ${deal.name} (${deal.status}): Target $${formatNumber(deal.target_raise as number)}, Committed $${formatNumber(deal.total_committed as number)}, Interested $${formatNumber(deal.total_interested as number)}
`;
  }

  context += `
LP CONTACTS (${lps.length} total):
`;

  // Group LPs by status
  const lpsByStatus: Record<string, Record<string, unknown>[]> = {};
  for (const lp of lps) {
    const status = (lp.status as string) || "unknown";
    if (!lpsByStatus[status]) lpsByStatus[status] = [];
    lpsByStatus[status].push(lp);
  }

  for (const [status, lpList] of Object.entries(lpsByStatus)) {
    context += `- ${status}: ${lpList.length} LPs\n`;
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
