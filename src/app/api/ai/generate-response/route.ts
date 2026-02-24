import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnthropicClient, SONNET_MODEL_ID } from "@/lib/ai/anthropic";
import { buildEmailResponsePrompt, ResponseTone } from "@/lib/ai/prompts";

export async function POST(request: NextRequest) {
  try {
    const { emailId, question, questions: questionsArray, dealId } = await request.json();

    // Support both single question (legacy) and questions array
    const questions: string[] = questionsArray || (question ? [question] : []);

    if (!emailId || questions.length === 0 || !dealId) {
      return NextResponse.json(
        { error: "emailId, questions (or question), and dealId are required" },
        { status: 400 }
      );
    }

    // Get Supabase client and user
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's organization and name
    const { data: userData } = await supabase
      .from("users")
      .select("organization_id, name")
      .eq("id", user.id)
      .single();

    if (!userData?.organization_id) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Get user's tone preference from user_settings
    const { data: userSettings } = await supabase
      .from("user_settings")
      .select("settings")
      .eq("user_id", user.id)
      .single();

    const tone: ResponseTone = userSettings?.settings?.ai_response_tone || "professional";

    // Fetch the original email
    const { data: email, error: emailError } = await supabase
      .from("emails_raw")
      .select("*")
      .eq("id", emailId)
      .eq("organization_id", userData.organization_id)
      .single();

    if (emailError || !email) {
      return NextResponse.json(
        { error: "Email not found" },
        { status: 404 }
      );
    }

    // Fetch deal details
    const { data: deal, error: dealError } = await supabase
      .from("deals")
      .select("*")
      .eq("id", dealId)
      .eq("organization_id", userData.organization_id)
      .single();

    if (dealError || !deal) {
      return NextResponse.json(
        { error: "Deal not found" },
        { status: 404 }
      );
    }

    // Try to find LP relationship based on email sender
    let lpTerms = undefined;
    const { data: lpContact } = await supabase
      .from("lp_contacts")
      .select("id, special_fee_percent, special_carry_percent")
      .eq("organization_id", userData.organization_id)
      .eq("email", email.from_email)
      .single();

    if (lpContact) {
      // Fetch LP relationship for this deal
      const { data: relationship } = await supabase
        .from("deal_lp_relationships")
        .select("*")
        .eq("deal_id", dealId)
        .eq("lp_contact_id", lpContact.id)
        .single();

      if (relationship) {
        lpTerms = {
          committedAmount: relationship.committed_amount,
          allocatedAmount: relationship.allocated_amount,
          specialFeePercent: lpContact.special_fee_percent ?? relationship.management_fee_percent,
          specialCarryPercent: lpContact.special_carry_percent ?? relationship.carry_percent,
          sideLetterTerms: relationship.side_letter_terms,
          hasMfnRights: relationship.has_mfn_rights || false,
          hasCoinvestRights: relationship.has_coinvest_rights || false,
        };
      }
    }

    // Build the prompt — format questions as numbered list if multiple
    const questionsText = questions.length === 1
      ? `"${questions[0]}"`
      : questions.map((q: string, i: number) => `${i + 1}. "${q}"`).join("\n");

    const prompt = buildEmailResponsePrompt({
      originalEmail: {
        fromEmail: email.from_email,
        fromName: email.from_name,
        subject: email.subject,
        bodyText: email.body_text,
        questions: questionsText,
      },
      deal: {
        name: deal.name,
        companyName: deal.company_name,
        description: deal.description,
        status: deal.status,
        targetRaise: deal.target_raise,
        totalCommitted: deal.total_committed || 0,
        totalInterested: deal.total_interested || 0,
        minCheckSize: deal.min_check_size,
        maxCheckSize: deal.max_check_size,
        feePercent: deal.fee_percent,
        carryPercent: deal.carry_percent,
        closeDate: deal.close_date,
        deadline: deal.deadline,
        createdDate: deal.created_date,
        investmentStage: deal.investment_stage,
        investmentType: deal.investment_type,
        memoUrl: deal.memo_url,
      },
      lpTerms,
      senderName: userData.name || user.email?.split("@")[0] || "Fund Manager",
      tone,
    });

    // Call Anthropic API
    const client = getAnthropicClient();
    const response = await client.messages.create({
      model: SONNET_MODEL_ID,
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    // Extract text response
    const textContent = response.content.find((block) => block.type === "text");
    const aiResponse = textContent
      ? (textContent as { type: "text"; text: string }).text
      : "";

    if (!aiResponse) {
      return NextResponse.json(
        { error: "Failed to generate response" },
        { status: 500 }
      );
    }

    // Return the generated response along with context
    return NextResponse.json({
      response: aiResponse,
      context: {
        dealName: deal.name,
        lpEmail: email.from_email,
        lpName: email.from_name,
        tone,
        hasLpSpecificTerms: !!lpTerms,
      },
    });
  } catch (error) {
    console.error("AI Generate Response error:", error);
    return NextResponse.json(
      { error: "Failed to generate response" },
      { status: 500 }
    );
  }
}
