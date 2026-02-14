import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseEmailWithAI, fetchParsingContext } from "@/lib/ai/parser";
import { processInBatches } from "@/lib/utils/batch";

const AI_BATCH_SIZE = 5;

export const maxDuration = 300; // 5 minutes

/**
 * POST /api/debug/reparse-all
 *
 * Reparse ALL emails with AI (use with caution - can be expensive)
 */
export async function POST() {
  const supabase = await createClient();

  // Get current user
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
    return NextResponse.json({ error: "No organization" }, { status: 400 });
  }

  const organizationId = userData.organization_id;

  // Find all emails parsed with simple method OR that failed
  const { data: parsedEmails, error: fetchError } = await supabase
    .from("emails_parsed")
    .select(
      `
      id,
      email_id,
      parsing_method,
      processing_status,
      emails_raw!inner (
        id,
        organization_id,
        from_email,
        from_name,
        subject,
        body_text,
        body_html,
        received_at,
        thread_id,
        to_emails,
        cc_emails,
        has_attachments,
        raw_payload,
        ingested_at,
        message_id,
        auth_account_id
      )
    `
    )
    .eq("emails_raw.organization_id", organizationId)
    .or("parsing_method.eq.simple,processing_status.eq.failed")
    .limit(500); // Safety limit

  if (fetchError) {
    console.error("Error fetching emails for reparse:", fetchError);
    return NextResponse.json(
      { error: "Failed to fetch emails" },
      { status: 500 }
    );
  }

  if (!parsedEmails || parsedEmails.length === 0) {
    return NextResponse.json({
      message: "No emails to reparse",
      processed: 0,
    });
  }

  // Pre-fetch AI parsing context once for all emails
  const parsingContext = await fetchParsingContext(supabase, organizationId);

  console.log(`[Reparse] Processing ${parsedEmails.length} emails in batches of ${AI_BATCH_SIZE}`);

  const { results, errors: batchErrors } = await processInBatches(
    parsedEmails,
    async (parsed, index) => {
      const email = parsed.emails_raw;
      // parseEmailWithAI uses upsert, so it will overwrite the existing record
      await parseEmailWithAI(supabase, email as any, organizationId, parsingContext);
      if ((index + 1) % 10 === 0) {
        console.log(`[Reparse] Processed ${index + 1}/${parsedEmails.length}`);
      }
    },
    AI_BATCH_SIZE
  );

  const succeeded = results.length;
  const failed = batchErrors.length;
  const errors = batchErrors.map(
    (e) => `Email ${parsedEmails[e.index].email_id}: ${e.error.message}`
  );

  return NextResponse.json({
    message: "Reparse complete",
    total: parsedEmails.length,
    processed: succeeded + failed,
    succeeded,
    failed,
    errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
  });
}
