import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGmailClient, fetchMessagePage, getMessageDetails, getCurrentHistoryId } from "@/lib/gmail/client";
import { parseEmailWithAI, fetchParsingContext } from "@/lib/ai/parser";
import { processInBatches } from "@/lib/utils/batch";
import { processEmailForSuggestedContact } from "@/lib/emails/suggested-contacts";
import { markThreadQuestionsAnswered } from "@/lib/emails/answer-detection";
import type { AuthAccount } from "@/lib/supabase/types";
import type { gmail_v1 } from "googleapis";
import type { SupabaseClient } from "@supabase/supabase-js";

const INGEST_CHUNK_SIZE = 30;
const PARSE_CHUNK_SIZE = 10;
const AI_BATCH_SIZE = 5;

export const maxDuration = 60;

// Cursor types
interface IngestCursor {
  phase: "ingest";
  gmailPageToken: string | null;
  messageIdsToProcess: string[];
  totalListed: number;
  newEmailsIngested: number;
}

interface ParseCursor {
  phase: "parse";
  totalToParse: number;
  parsedSoFar: number;
  dealsMatched: number;
}

interface FinalizeCursor {
  phase: "finalize";
}

type BackfillCursor = IngestCursor | ParseCursor | FinalizeCursor;

interface ChunkStats {
  totalGmailMessages: number;
  newEmailsIngested: number;
  emailsParsed: number;
  dealsMatched: number;
  errors: string[];
}

/**
 * POST /api/emails/backfill-chunk
 *
 * Chunked backfill endpoint. Each call processes a small batch and returns
 * a cursor for the next call. The frontend drives the loop.
 */
export async function POST(request: NextRequest) {
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

  // Parse request
  const body = await request.json();
  const phase: string = body.phase || "ingest";
  const cursor: BackfillCursor | null = body.cursor
    ? JSON.parse(body.cursor)
    : null;

  try {
    const gmail = await getGmailClient(authAccount as AuthAccount);

    if (phase === "ingest") {
      return handleIngestChunk(
        gmail,
        supabase,
        organizationId,
        authAccount.id,
        cursor as IngestCursor | null
      );
    } else if (phase === "parse") {
      return handleParseChunk(
        supabase,
        organizationId,
        cursor as ParseCursor | null
      );
    } else if (phase === "finalize") {
      return handleFinalize(gmail, supabase, organizationId, authAccount.id);
    }

    return NextResponse.json({ error: "Invalid phase" }, { status: 400 });
  } catch (err: unknown) {
    console.error("[Backfill Chunk] Error:", (err as Error).message);
    return NextResponse.json(
      { error: (err as Error).message || "Backfill chunk failed" },
      { status: 500 }
    );
  }
}

async function handleIngestChunk(
  gmail: gmail_v1.Gmail,
  supabase: SupabaseClient,
  organizationId: string,
  authAccountId: string,
  cursor: IngestCursor | null
) {
  const stats: ChunkStats = {
    totalGmailMessages: cursor?.totalListed || 0,
    newEmailsIngested: 0,
    emailsParsed: 0,
    dealsMatched: 0,
    errors: [],
  };

  let messageIds = cursor?.messageIdsToProcess || [];
  let gmailPageToken = cursor?.gmailPageToken ?? null;
  let totalListed = cursor?.totalListed || 0;
  let cumulativeIngested = cursor?.newEmailsIngested || 0;

  // If we have no message IDs to process, fetch the next page from Gmail
  if (messageIds.length === 0) {
    const page = await fetchMessagePage(gmail, gmailPageToken);

    totalListed += page.messageIds.length;
    gmailPageToken = page.nextPageToken;

    // Filter out already-ingested message IDs
    const { data: existingEmails } = await supabase
      .from("emails_raw")
      .select("message_id")
      .eq("organization_id", organizationId);

    const existingSet = new Set(
      (existingEmails || []).map((e: { message_id: string }) => e.message_id)
    );

    messageIds = page.messageIds.filter((id) => !existingSet.has(id));

    console.log(
      `[Backfill Chunk] Fetched page: ${page.messageIds.length} IDs, ${messageIds.length} new, nextPage: ${gmailPageToken ? "yes" : "no"}`
    );

    // If this page had no new messages and there are more pages, return cursor for next page
    if (messageIds.length === 0 && gmailPageToken) {
      return NextResponse.json({
        done: false,
        phase: "ingest",
        cursor: JSON.stringify({
          phase: "ingest",
          gmailPageToken,
          messageIdsToProcess: [],
          totalListed,
          newEmailsIngested: cumulativeIngested,
        } satisfies IngestCursor),
        stats: { ...stats, totalGmailMessages: totalListed, newEmailsIngested: 0 },
        progress: {
          current: totalListed - messageIds.length,
          total: totalListed,
          message: `Scanning inbox (${cumulativeIngested} new emails found)...`,
        },
      });
    }

    // If no new messages and no more pages, transition to parse
    if (messageIds.length === 0 && !gmailPageToken) {
      return NextResponse.json({
        done: false,
        phase: "parse",
        cursor: null,
        stats: { ...stats, totalGmailMessages: totalListed, newEmailsIngested: 0 },
        progress: {
          current: totalListed,
          total: totalListed,
          message: "Ingestion complete. Starting AI parsing...",
        },
      });
    }
  }

  stats.totalGmailMessages = totalListed;

  // Process up to INGEST_CHUNK_SIZE messages
  const batch = messageIds.slice(0, INGEST_CHUNK_SIZE);
  const remaining = messageIds.slice(INGEST_CHUNK_SIZE);

  for (const messageId of batch) {
    try {
      const details = await getMessageDetails(gmail, messageId);

      const { data: insertedEmail, error: insertError } = await supabase
        .from("emails_raw")
        .insert({
          organization_id: organizationId,
          auth_account_id: authAccountId,
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

        await processEmailForSuggestedContact(supabase, organizationId, {
          id: insertedEmail.id,
          from_email: details.from.email,
          from_name: details.from.name,
        });
      }
    } catch (err: unknown) {
      stats.errors.push(`Message ${messageId}: ${(err as Error).message}`);
    }
  }

  cumulativeIngested += stats.newEmailsIngested;

  // Determine next state
  const hasMoreIds = remaining.length > 0;
  const hasMorePages = !!gmailPageToken;

  if (!hasMoreIds && !hasMorePages) {
    // All pages exhausted, all IDs processed — transition to parse
    return NextResponse.json({
      done: false,
      phase: "parse",
      cursor: null,
      stats,
      progress: {
        current: totalListed,
        total: totalListed,
        message: `Ingestion complete (${cumulativeIngested} new). Starting AI parsing...`,
      },
    });
  }

  // More work to do in ingest phase
  return NextResponse.json({
    done: false,
    phase: "ingest",
    cursor: JSON.stringify({
      phase: "ingest",
      gmailPageToken,
      messageIdsToProcess: remaining,
      totalListed,
      newEmailsIngested: cumulativeIngested,
    } satisfies IngestCursor),
    stats,
    progress: {
      current: totalListed - remaining.length,
      total: totalListed + (hasMorePages ? 500 : 0), // estimate if more pages
      message: `Ingesting emails (${cumulativeIngested} new)...`,
    },
  });
}

async function handleParseChunk(
  supabase: SupabaseClient,
  organizationId: string,
  cursor: ParseCursor | null
) {
  const stats: ChunkStats = {
    totalGmailMessages: 0,
    newEmailsIngested: 0,
    emailsParsed: 0,
    dealsMatched: 0,
    errors: [],
  };

  // Get IDs of already-successfully-parsed emails
  const { data: parsedRecords } = await supabase
    .from("emails_parsed")
    .select("email_id")
    .eq("processing_status", "success");

  const parsedEmailIds = new Set(
    (parsedRecords || []).map((r: { email_id: string }) => r.email_id)
  );

  // Get unparsed emails for this org
  const { data: allOrgEmails } = await supabase
    .from("emails_raw")
    .select("*")
    .eq("organization_id", organizationId)
    .order("received_at", { ascending: false });

  const unparsedEmails = (allOrgEmails || []).filter(
    (e: { id: string }) => !parsedEmailIds.has(e.id)
  );

  // First call of parse phase — snapshot the total
  const totalToParse = cursor?.totalToParse ?? unparsedEmails.length;
  const parsedSoFar = cursor?.parsedSoFar ?? 0;
  let cumulativeDealsMatched = cursor?.dealsMatched ?? 0;

  if (unparsedEmails.length === 0) {
    // Nothing to parse — transition to finalize
    return NextResponse.json({
      done: false,
      phase: "finalize",
      cursor: null,
      stats,
      progress: {
        current: totalToParse,
        total: totalToParse,
        message: "Parsing complete. Finalizing...",
      },
    });
  }

  // Take a chunk
  const chunk = unparsedEmails.slice(0, PARSE_CHUNK_SIZE);
  const parsingContext = await fetchParsingContext(supabase, organizationId);

  const { errors: batchErrors } = await processInBatches(
    chunk,
    async (email) => {
      const result = await parseEmailWithAI(
        supabase,
        email,
        organizationId,
        parsingContext
      );
      stats.emailsParsed++;
      if (result.detectedDealId) {
        stats.dealsMatched++;
      }
      return result;
    },
    AI_BATCH_SIZE
  );

  for (const err of batchErrors) {
    const email = chunk[err.index];
    stats.errors.push(`Parse ${email.from_email}: ${err.error.message}`);
  }

  const newParsedSoFar = parsedSoFar + stats.emailsParsed;
  cumulativeDealsMatched += stats.dealsMatched;
  const remainingAfterChunk = unparsedEmails.length - chunk.length;

  if (remainingAfterChunk <= 0) {
    // All parsed — transition to finalize
    return NextResponse.json({
      done: false,
      phase: "finalize",
      cursor: null,
      stats,
      progress: {
        current: totalToParse,
        total: totalToParse,
        message: `Parsing complete (${cumulativeDealsMatched} deals matched). Finalizing...`,
      },
    });
  }

  // More to parse
  return NextResponse.json({
    done: false,
    phase: "parse",
    cursor: JSON.stringify({
      phase: "parse",
      totalToParse,
      parsedSoFar: newParsedSoFar,
      dealsMatched: cumulativeDealsMatched,
    } satisfies ParseCursor),
    stats,
    progress: {
      current: newParsedSoFar,
      total: totalToParse,
      message: `Parsing with AI (${cumulativeDealsMatched} deals matched)...`,
    },
  });
}

async function handleFinalize(
  gmail: gmail_v1.Gmail,
  supabase: SupabaseClient,
  organizationId: string,
  authAccountId: string
) {
  // Detect thread-based answers
  try {
    const { data: recentEmails } = await supabase
      .from("emails_raw")
      .select("from_email, thread_id")
      .eq("organization_id", organizationId);

    if (recentEmails) {
      const answered = await markThreadQuestionsAnswered(
        supabase,
        recentEmails,
        organizationId
      );
      if (answered > 0) {
        console.log(
          `[Backfill] Marked ${answered} questions as answered via thread detection`
        );
      }
    }
  } catch (err: unknown) {
    console.error(
      `[Backfill] Answer detection error:`,
      (err as Error).message
    );
  }

  // Save sync_cursor for future incremental syncs
  try {
    const currentHistoryId = await getCurrentHistoryId(gmail);
    await supabase
      .from("auth_accounts")
      .update({
        sync_cursor: currentHistoryId,
        last_sync_at: new Date().toISOString(),
      })
      .eq("id", authAccountId);
    console.log(`[Backfill] Saved sync_cursor: ${currentHistoryId}`);
  } catch (cursorErr) {
    console.error(`[Backfill] Failed to save sync_cursor:`, cursorErr);
  }

  return NextResponse.json({
    done: true,
    phase: "finalize",
    stats: {
      totalGmailMessages: 0,
      newEmailsIngested: 0,
      emailsParsed: 0,
      dealsMatched: 0,
      errors: [],
    },
    progress: {
      current: 1,
      total: 1,
      message: "Backfill complete!",
    },
  });
}
