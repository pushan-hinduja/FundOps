import { getAnthropicClient, MODEL_ID, MODEL_VERSION } from "./anthropic";
import { buildParsingPrompt } from "./prompts";
import { ParsedEmailSchema, type ParsedEmail, type LPContext, type DealContext } from "./types";
import { getCachedDeals, getCachedLPs } from "./context-cache";
import type { EmailRaw } from "../supabase/types";

const CONFIDENCE_THRESHOLD = 0.7;

export interface ParseEmailResult {
  lpCreated: boolean;
  lpMatched: boolean;
  detectedLpId: string | null;
  detectedDealId: string | null;
  parsedEntities: {
    lp: { name?: string; email?: string; firm?: string };
  };
}

export async function parseEmailWithAI(
  supabase: any,
  email: EmailRaw,
  organizationId: string
): Promise<ParseEmailResult> {
  // Create or update pending parse record (use upsert to handle existing records)
  const { data: parseRecord, error: createError } = await supabase
    .from("emails_parsed")
    .upsert(
      {
        email_id: email.id,
        processing_status: "processing",
        model_version: MODEL_VERSION,
      },
      {
        onConflict: "email_id",
        ignoreDuplicates: false,
      }
    )
    .select()
    .single();

  if (createError) {
    throw new Error(`Failed to create parse record: ${createError.message}`);
  }

  try {
    // Fetch context: known LPs and deals (cached)
    const [lps, deals] = await Promise.all([
      getCachedLPs(supabase, organizationId),
      getCachedDeals(supabase, organizationId),
    ]);

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

    // Parse JSON response (strip markdown code blocks if present)
    let parsed: ParsedEmail;
    try {
      let jsonStr = content.text.trim();

      // Remove markdown code blocks if present
      if (jsonStr.startsWith("```")) {
        // Remove opening ```json or ``` and closing ```
        jsonStr = jsonStr
          .replace(/^```json?\s*\n?/i, "")
          .replace(/\n?```\s*$/i, "")
          .trim();
      }

      const jsonData = JSON.parse(jsonStr);
      parsed = ParsedEmailSchema.parse(jsonData);
    } catch (parseErr) {
      console.error("[AI Parser] Raw response:", content.text.substring(0, 500));
      throw new Error(`Failed to parse Claude response as JSON: ${parseErr}`);
    }

    // Determine processing status based on confidence
    const avgConfidence =
      (parsed.confidence.lp + parsed.confidence.deal + parsed.confidence.intent) / 3;
    const processingStatus =
      avgConfidence < CONFIDENCE_THRESHOLD ? "manual_review" : "success";

    // Handle LP matching (DO NOT auto-create - let suggested contacts handle it)
    let detectedLpId = parsed.lp.matched_lp_id;
    let lpMatched = !!parsed.lp.matched_lp_id;
    let lpCreated = false;

    if (!detectedLpId && parsed.lp.email) {
      // Try to find LP by email (case-insensitive)
      const { data: existingLp } = await supabase
        .from("lp_contacts")
        .select("id")
        .eq("organization_id", organizationId)
        .ilike("email", parsed.lp.email)
        .single();

      if (existingLp) {
        detectedLpId = existingLp.id;
        lpMatched = true;
      }
      // Removed auto-creation - contacts should go through suggested contacts flow
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
        extracted_questions: parsed.questions,
        parsing_method: "ai",
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

    return {
      lpCreated,
      lpMatched,
      detectedLpId,
      detectedDealId: parsed.deal.matched_deal_id,
      parsedEntities: {
        lp: {
          name: parsed.lp.name ?? undefined,
          email: parsed.lp.email ?? undefined,
          firm: parsed.lp.firm ?? undefined,
        },
      },
    };
  } catch (err: any) {
    console.error("[AI Parser] Error details:", {
      message: err.message,
      stack: err.stack,
      emailId: email.id,
      fromEmail: email.from_email,
    });

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
