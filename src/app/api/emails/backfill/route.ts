import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getGmailClient, fetchAllMessages, getMessageDetails, getCurrentHistoryId } from "@/lib/gmail/client";
import { parseEmailWithAI } from "@/lib/ai/parser";
import type { AuthAccount } from "@/lib/supabase/types";

export const maxDuration = 300; // 5 minutes for backfill

/**
 * POST /api/emails/backfill
 *
 * Backfill ALL emails from Gmail inbox with AI parsing.
 * This will:
 * 1. Fetch ALL emails from Gmail (no limit)
 * 2. Ingest any new emails to emails_raw
 * 3. Parse ALL emails with AI (looks across ALL deals)
 * 4. AI will detect deal mentions and set detected_deal_id
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from("users")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (!userData?.organization_id) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    const organizationId = userData.organization_id;

    // Get auth account for Gmail
    const { data: authAccount, error: authError } = await supabase
      .from("auth_accounts")
      .select("*")
      .eq("user_id", user.id)
      .eq("provider", "gmail")
      .eq("is_active", true)
      .single();

    if (authError || !authAccount) {
      return NextResponse.json(
        { error: "No Gmail account connected" },
        { status: 400 }
      );
    }

    console.log(`[Backfill] Starting backfill for organization: ${organizationId}`);

    // Get Gmail client
    const gmail = await getGmailClient(authAccount as AuthAccount);

    // Fetch ALL messages from Gmail
    console.log(`[Backfill] Fetching ALL messages from Gmail...`);
    const messages = await fetchAllMessages(gmail);
    console.log(`[Backfill] Found ${messages.length} total messages in Gmail`);

    const stats = {
      totalGmailMessages: messages.length,
      newEmailsIngested: 0,
      emailsParsed: 0,
      dealsMatched: 0,
      errors: [] as string[],
    };

    // Get existing message IDs to avoid duplicates
    const { data: existingEmails } = await supabase
      .from("emails_raw")
      .select("message_id")
      .eq("organization_id", organizationId);

    const existingMessageIds = new Set(
      (existingEmails || []).map((e) => e.message_id)
    );

    console.log(`[Backfill] ${existingMessageIds.size} emails already in database`);

    // Process each message
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];

      try {
        // Skip if already ingested
        if (existingMessageIds.has(message.id!)) {
          continue;
        }

        // Get full message details
        const details = await getMessageDetails(gmail, message.id!);

        console.log(
          `[Backfill] Ingesting ${i + 1}/${messages.length}: ${details.from.email} - ${details.subject?.substring(0, 50) || "(no subject)"}`
        );

        // Insert into emails_raw
        const { data: insertedEmail, error: insertError } = await supabase
          .from("emails_raw")
          .insert({
            organization_id: organizationId,
            auth_account_id: authAccount.id,
            message_id: details.id,
            thread_id: details.threadId,
            from_email: details.from.email,
            from_name: details.from.name,
            to_emails: details.to,
            cc_emails: details.cc,
            subject: details.subject,
            body_text: details.bodyText,
            body_html: details.bodyHtml,
            received_at: details.receivedAt.toISOString(),
            has_attachments: details.hasAttachments,
          })
          .select()
          .single();

        if (insertError) {
          stats.errors.push(`Insert ${details.from.email}: ${insertError.message}`);
          continue;
        }

        stats.newEmailsIngested++;

        // Add to suggested contacts if not in LP database
        if (insertedEmail && details.from.email) {
          const { data: existingLP } = await supabase
            .from("lp_contacts")
            .select("id")
            .eq("organization_id", organizationId)
            .ilike("email", details.from.email)
            .single();

          if (!existingLP) {
            await supabase.from("suggested_contacts").upsert(
              {
                organization_id: organizationId,
                email: details.from.email,
                name: details.from.name || details.from.email.split("@")[0],
                firm: null,
                source_email_id: insertedEmail.id,
                is_dismissed: false,
              },
              { onConflict: "organization_id,email", ignoreDuplicates: false }
            );
          }
        }
      } catch (err: any) {
        stats.errors.push(`Message ${message.id}: ${err.message}`);
      }
    }

    console.log(`[Backfill] Ingestion complete. New emails: ${stats.newEmailsIngested}`);

    // Now parse ALL emails with AI
    console.log(`[Backfill] Starting AI parsing for ALL emails...`);

    const { data: allEmails, error: fetchError } = await supabase
      .from("emails_raw")
      .select("*")
      .eq("organization_id", organizationId)
      .order("received_at", { ascending: false });

    if (fetchError) {
      console.error("[Backfill] Error fetching emails for parsing:", fetchError);
    } else if (allEmails) {
      console.log(`[Backfill] Parsing ${allEmails.length} emails with AI...`);

      for (let i = 0; i < allEmails.length; i++) {
        const email = allEmails[i];

        try {
          if (i % 10 === 0) {
            console.log(`[Backfill] Parsing progress: ${i + 1}/${allEmails.length}`);
          }

          const result = await parseEmailWithAI(supabase, email, organizationId);
          stats.emailsParsed++;

          if (result.detectedDealId) {
            stats.dealsMatched++;
            console.log(`[Backfill] ✓ Deal matched: ${email.subject}`);
          }
        } catch (err: any) {
          stats.errors.push(`Parse ${email.from_email}: ${err.message}`);
        }
      }
    }

    // Save sync_cursor so future syncs use incremental history API
    try {
      const currentHistoryId = await getCurrentHistoryId(gmail);
      await supabase
        .from("auth_accounts")
        .update({
          sync_cursor: currentHistoryId,
          last_sync_at: new Date().toISOString(),
        })
        .eq("id", authAccount.id);
      console.log(`[Backfill] Saved sync_cursor: ${currentHistoryId}`);
    } catch (cursorErr) {
      console.error(`[Backfill] Failed to save sync_cursor:`, cursorErr);
    }

    console.log(`[Backfill] Complete!`);
    console.log(`  - Gmail messages: ${stats.totalGmailMessages}`);
    console.log(`  - New emails ingested: ${stats.newEmailsIngested}`);
    console.log(`  - Emails parsed with AI: ${stats.emailsParsed}`);
    console.log(`  - Deals matched: ${stats.dealsMatched}`);
    console.log(`  - Errors: ${stats.errors.length}`);

    return NextResponse.json({
      message: "Backfill complete",
      stats,
      errors: stats.errors.length > 0 ? stats.errors.slice(0, 20) : undefined,
    });
  } catch (error: any) {
    console.error("[Backfill] Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
