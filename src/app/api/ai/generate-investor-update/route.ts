import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnthropicClient, SONNET_MODEL_ID } from "@/lib/ai/anthropic";

export async function POST(request: NextRequest) {
  try {
    const { dealId, type, founderResponse } = await request.json();

    if (!dealId || !type || !["request", "lp_update"].includes(type)) {
      return NextResponse.json(
        { error: "dealId and type ('request' or 'lp_update') are required" },
        { status: 400 }
      );
    }

    if (type === "lp_update" && !founderResponse) {
      return NextResponse.json(
        { error: "founderResponse is required for lp_update type" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from("users")
      .select("organization_id, name")
      .eq("id", user.id)
      .single();

    if (!userData?.organization_id) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Fetch deal context
    const { data: deal } = await supabase
      .from("deals")
      .select("name, company_name, description, target_raise, total_committed, investment_stage, investment_type, close_date")
      .eq("id", dealId)
      .eq("organization_id", userData.organization_id)
      .single();

    if (!deal) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    const companyName = deal.company_name || deal.name;
    const senderName = userData.name || user.email?.split("@")[0] || "Fund Manager";

    let prompt: string;

    if (type === "request") {
      prompt = `You are a fund manager writing a brief email to a portfolio company founder requesting an investor update.

DEAL CONTEXT:
- Company: ${companyName}
- Deal: ${deal.name}
${deal.investment_stage ? `- Stage: ${deal.investment_stage}` : ""}
${deal.close_date ? `- Close Date: ${deal.close_date}` : ""}

INSTRUCTIONS:
1. Write a concise, friendly email requesting an investor update from the founder
2. Keep it to 3-4 sentences max
3. Ask them to reply with updates on progress, key metrics, and any notable news
4. Be professional but warm
5. Do NOT include a subject line — just the email body
6. Sign off with: ${senderName}`;
    } else {
      prompt = `You are a fund manager preparing an investor update email to send to your LPs (limited partners).

DEAL CONTEXT:
- Company: ${companyName}
- Deal: ${deal.name}
${deal.investment_stage ? `- Stage: ${deal.investment_stage}` : ""}
${deal.target_raise ? `- Target Raise: $${(deal.target_raise / 1000000).toFixed(1)}M` : ""}

FOUNDER'S UPDATE:
${founderResponse}

INSTRUCTIONS:
1. Clean up and format the founder's update into a professional investor update email
2. Keep it concise — preserve the key information but remove any conversational filler
3. Start with a brief intro line like "Here is the latest update on ${companyName}."
4. Present the update content clearly — use the founder's data points and metrics
5. Do NOT add information that wasn't in the founder's response
6. Do NOT include a subject line — just the email body
7. Sign off with: ${senderName}`;
    }

    const client = getAnthropicClient();
    const response = await client.messages.create({
      model: SONNET_MODEL_ID,
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const textContent = response.content.find((block) => block.type === "text");
    const draft = textContent
      ? (textContent as { type: "text"; text: string }).text
      : "";

    if (!draft) {
      return NextResponse.json({ error: "Failed to generate draft" }, { status: 500 });
    }

    return NextResponse.json({ draft });
  } catch (error) {
    console.error("AI Generate Investor Update error:", error);
    return NextResponse.json(
      { error: "Failed to generate draft" },
      { status: 500 }
    );
  }
}
