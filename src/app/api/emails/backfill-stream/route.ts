import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGmailClient, fetchAllMessages, getMessageDetails, getCurrentHistoryId } from "@/lib/gmail/client";
import { parseEmailWithAI, fetchParsingContext } from "@/lib/ai/parser";
import { processInBatches } from "@/lib/utils/batch";
import type { AuthAccount } from "@/lib/supabase/types";

const AI_BATCH_SIZE = 5; // Concurrent AI parsing calls

export const maxDuration = 300; // 5 minutes for backfill

/**
 * GET /api/emails/backfill-stream
 *
 * SSE endpoint for backfilling emails with real-time progress updates.
 * Uses Server-Sent Events to stream progress to the client.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: userData } = await supabase
    .from("users")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!userData?.organization_id) {
    return new Response(JSON.stringify({ error: "No organization" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
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
    return new Response(JSON.stringify({ error: "No Gmail account connected" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Create SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      try {
        sendEvent("status", { status: "fetching", message: "Connecting to Gmail..." });

        // Get Gmail client
        const gmail = await getGmailClient(authAccount as AuthAccount);

        sendEvent("status", { status: "fetching", message: "Fetching messages from Gmail..." });

        // Fetch ALL messages from Gmail
        const messages = await fetchAllMessages(gmail);

        sendEvent("status", {
          status: "processing",
          message: `Found ${messages.length} messages`,
          total: messages.length,
        });

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

        // Phase 1: Ingest new emails
        sendEvent("status", {
          status: "processing",
          message: "Ingesting new emails...",
          phase: "ingest",
          current: 0,
          total: messages.length,
        });

        for (let i = 0; i < messages.length; i++) {
          const message = messages[i];

          try {
            // Skip if already ingested
            if (existingMessageIds.has(message.id!)) {
              continue;
            }

            // Get full message details
            const details = await getMessageDetails(gmail, message.id!);

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

            if (!insertError && insertedEmail) {
              stats.newEmailsIngested++;

              // Add to suggested contacts if not in LP database
              if (details.from.email) {
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
            }
          } catch (err: unknown) {
            const error = err as Error;
            stats.errors.push(`Message ${message.id}: ${error.message}`);
          }

          // Send progress every 5 messages
          if (i % 5 === 0 || i === messages.length - 1) {
            sendEvent("progress", {
              phase: "ingest",
              current: i + 1,
              total: messages.length,
              newEmailsIngested: stats.newEmailsIngested,
            });
          }
        }

        // Phase 2: Parse only unparsed/failed emails with AI
        // Get IDs of emails already successfully parsed
        const { data: parsedRecords } = await supabase
          .from("emails_parsed")
          .select("email_id")
          .eq("processing_status", "success");

        const parsedEmailIds = new Set(
          (parsedRecords || []).map((r: { email_id: string }) => r.email_id)
        );

        // Fetch only emails that need parsing
        const { data: allEmails } = await supabase
          .from("emails_raw")
          .select("*")
          .eq("organization_id", organizationId)
          .order("received_at", { ascending: false });

        const emailsToParse = (allEmails || []).filter(
          (e: { id: string }) => !parsedEmailIds.has(e.id)
        );

        if (emailsToParse.length > 0) {
          const parsingContext = await fetchParsingContext(supabase, organizationId);

          sendEvent("status", {
            status: "processing",
            message: `Parsing ${emailsToParse.length} unparsed emails with AI (${parsedEmailIds.size} already done)...`,
            phase: "parse",
            current: 0,
            total: emailsToParse.length,
          });

          const { errors: batchErrors } = await processInBatches(
            emailsToParse,
            async (email) => {
              const result = await parseEmailWithAI(supabase, email, organizationId, parsingContext);
              stats.emailsParsed++;
              if (result.detectedDealId) {
                stats.dealsMatched++;
              }
              return result;
            },
            AI_BATCH_SIZE,
            (completed) => {
              sendEvent("progress", {
                phase: "parse",
                current: completed,
                total: emailsToParse.length,
                emailsParsed: stats.emailsParsed,
                dealsMatched: stats.dealsMatched,
              });
            }
          );

          for (const err of batchErrors) {
            const email = emailsToParse[err.index];
            stats.errors.push(`Parse ${email.from_email}: ${err.error.message}`);
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

        // Send completion
        sendEvent("complete", {
          message: "Backfill complete!",
          stats: {
            totalGmailMessages: stats.totalGmailMessages,
            newEmailsIngested: stats.newEmailsIngested,
            emailsParsed: stats.emailsParsed,
            dealsMatched: stats.dealsMatched,
          },
        });

        controller.close();
      } catch (error: unknown) {
        const err = error as Error;
        sendEvent("error", { message: err.message || "Backfill failed" });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
