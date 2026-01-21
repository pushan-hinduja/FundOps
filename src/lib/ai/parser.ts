import { getAnthropicClient, MODEL_ID, MODEL_VERSION } from "./anthropic";
import { buildParsingPrompt } from "./prompts";
import { ParsedEmailSchema, type ParsedEmail, type LPContext, type DealContext } from "./types";
import type { EmailRaw } from "../supabase/types";

const CONFIDENCE_THRESHOLD = 0.7;

export async function parseEmailWithAI(
  supabase: any,
  email: EmailRaw,
  organizationId: string
): Promise<void> {
  // Create pending parse record
  const { data: parseRecord, error: createError } = await supabase
    .from("emails_parsed")
    .insert({
      email_id: email.id,
      processing_status: "processing",
      model_version: MODEL_VERSION,
    })
    .select()
    .single();

  if (createError) {
    throw new Error(`Failed to create parse record: ${createError.message}`);
  }

  try {
    // Fetch context: known LPs and deals
    const [lpsResult, dealsResult] = await Promise.all([
      supabase
        .from("lp_contacts")
        .select("id, name, email, firm")
        .eq("organization_id", organizationId)
        .limit(100),
      supabase
        .from("deals")
        .select("id, name, company_name, status")
        .eq("organization_id", organizationId)
        .in("status", ["draft", "active"])
        .limit(50),
    ]);

    const lps: LPContext[] = lpsResult.data || [];
    const deals: DealContext[] = dealsResult.data || [];

    // Build prompt
    const prompt = buildParsingPrompt(
      {
        from_email: email.from_email,
        from_name: email.from_name,
        subject: email.subject,
        body_text: email.body_text,
        received_at: email.received_at,
      },
      lps,
      deals
    );

    // Call Claude API
    const client = getAnthropicClient();
    const response = await client.messages.create({
      model: MODEL_ID,
      max_tokens: 1000,
      temperature: 0.1,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    // Extract JSON from response
    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from Claude");
    }

    // Parse JSON response
    let parsed: ParsedEmail;
    try {
      const jsonStr = content.text.trim();
      const jsonData = JSON.parse(jsonStr);
      parsed = ParsedEmailSchema.parse(jsonData);
    } catch (parseErr) {
      throw new Error(`Failed to parse Claude response as JSON: ${parseErr}`);
    }

    // Determine processing status based on confidence
    const avgConfidence =
      (parsed.confidence.lp + parsed.confidence.deal + parsed.confidence.intent) / 3;
    const processingStatus =
      avgConfidence < CONFIDENCE_THRESHOLD ? "manual_review" : "success";

    // Handle LP matching/creation
    let detectedLpId = parsed.lp.matched_lp_id;
    if (!detectedLpId && parsed.lp.email) {
      // Try to find LP by email
      const { data: existingLp } = await supabase
        .from("lp_contacts")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("email", parsed.lp.email)
        .single();

      if (existingLp) {
        detectedLpId = existingLp.id;
      } else if (parsed.lp.name) {
        // Create new LP
        const { data: newLp } = await supabase
          .from("lp_contacts")
          .insert({
            organization_id: organizationId,
            name: parsed.lp.name,
            email: parsed.lp.email,
            firm: parsed.lp.firm,
          })
          .select()
          .single();

        if (newLp) {
          detectedLpId = newLp.id;
        }
      }
    }

    // Update parse record
    const { error: updateError } = await supabase
      .from("emails_parsed")
      .update({
        detected_lp_id: detectedLpId,
        detected_deal_id: parsed.deal.matched_deal_id,
        intent: parsed.intent,
        commitment_amount: parsed.commitment_amount,
        sentiment: parsed.sentiment,
        topics: parsed.topics,
        entities: {
          lp: parsed.lp,
          deal: parsed.deal,
          reasoning: parsed.reasoning,
        },
        confidence_scores: parsed.confidence,
        processing_status: processingStatus,
        parsed_at: new Date().toISOString(),
      })
      .eq("id", parseRecord.id);

    if (updateError) {
      throw new Error(`Failed to update parse record: ${updateError.message}`);
    }

    // Update LP last_interaction_at
    if (detectedLpId) {
      await supabase
        .from("lp_contacts")
        .update({ last_interaction_at: email.received_at })
        .eq("id", detectedLpId);
    }

    // Update deal totals if committed
    if (parsed.deal.matched_deal_id && parsed.intent === "committed" && parsed.commitment_amount) {
      // This could be done with a database function for accuracy
      // For now, we'll rely on computed totals from the UI
    }
  } catch (err: any) {
    // Update parse record with error
    await supabase
      .from("emails_parsed")
      .update({
        processing_status: "failed",
        error_message: err.message,
      })
      .eq("id", parseRecord.id);

    throw err;
  }
}
