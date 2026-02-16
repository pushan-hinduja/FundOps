import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getGmailClient, fetchUnreadMessages, fetchMessagesSinceHistory, getCurrentHistoryId, getMessageDetails } from "@/lib/gmail/client";
import { parseEmailWithAI, fetchParsingContext } from "@/lib/ai/parser";
import { processInBatches } from "@/lib/utils/batch";
import { processEmailForSuggestedContact } from "@/lib/emails/suggested-contacts";
import { markThreadQuestionsAnswered } from "@/lib/emails/answer-detection";
import type { AuthAccount } from "@/lib/supabase/types";

const AI_BATCH_SIZE = 5;

export const maxDuration = 60; // Maximum execution time in seconds

async function processInboxSync(userId?: string) {
  const supabase = createServiceClient();
  const stats = {
    accountsProcessed: 0,
    emailsIngested: 0,
    emailsParsed: 0,
    suggestedContactsAdded: 0,
    errors: [] as string[],
  };

  try {
    // Build query for active auth accounts
    let query = supabase
      .from("auth_accounts")
      .select("*")
      .eq("is_active", true)
      .eq("provider", "gmail");

    // If userId provided, only sync that user's accounts
    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data: authAccounts, error: accountsError } = await query;

    if (accountsError) {
      throw new Error(`Failed to fetch auth accounts: ${accountsError.message}`);
    }

    if (!authAccounts || authAccounts.length === 0) {
      return {
        message: "No active Gmail accounts to poll",
        stats,
      };
    }

    // Fetch user organization data separately
    const userIds = Array.from(new Set(authAccounts.map((acc) => acc.user_id)));
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, organization_id")
      .in("id", userIds);

    if (usersError) {
      throw new Error(`Failed to fetch users: ${usersError.message}`);
    }

    // Create a map for quick lookup
    const userOrgMap = new Map(users?.map((u) => [u.id, u.organization_id]) || []);

    // Process each account
    for (const account of authAccounts) {
      try {
        const organizationId = userOrgMap.get(account.user_id);
        if (!organizationId) {
          stats.errors.push(`Account ${account.email}: User has no organization`);
          continue;
        }

        await processAccount(
          supabase,
          { ...account, users: { organization_id: organizationId } } as AuthAccount & {
            users: { organization_id: string };
          },
          stats
        );
        stats.accountsProcessed++;
      } catch (err: any) {
        stats.errors.push(`Account ${account.email}: ${err.message}`);
      }
    }

    return {
      message: "Email polling complete",
      stats,
    };
  } catch (err: any) {
    console.error("Cron job error:", err);
    throw err;
  }
}

export async function GET(request: NextRequest) {
  // Verify cron secret (Vercel sends this in header for cron jobs)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // In production, verify the cron secret
  // In development, allow manual triggering without secret
  if (process.env.NODE_ENV === "production" && cronSecret) {
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await processInboxSync();
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message, stats: { accountsProcessed: 0, emailsIngested: 0, emailsParsed: 0, suggestedContactsAdded: 0, errors: [] } },
      { status: 500 }
    );
  }
}

async function processAccount(
  supabase: ReturnType<typeof createServiceClient>,
  account: AuthAccount & { users: { organization_id: string } },
  stats: { emailsIngested: number; emailsParsed: number; suggestedContactsAdded: number; errors: string[] }
) {
  console.log(`[Email Sync] Processing account: ${account.email}`);

  const gmail = await getGmailClient(account);
  const organizationId = account.users.organization_id;

  // Determine which message IDs to process
  let messageIdsToProcess: string[] = [];
  let newSyncCursor: string | null = null;

  if (account.sync_cursor) {
    // INCREMENTAL SYNC: Use Gmail History API
    console.log(`[Email Sync] Using incremental sync (historyId: ${account.sync_cursor})`);
    try {
      const { messageIds, newHistoryId } = await fetchMessagesSinceHistory(gmail, account.sync_cursor);
      messageIdsToProcess = messageIds;
      newSyncCursor = newHistoryId;
      console.log(`[Email Sync] History API returned ${messageIds.length} new messages`);
    } catch (err: any) {
      // History ID expired (404) — fall back to full unread fetch
      console.warn(`[Email Sync] History ID expired for ${account.email}, falling back to unread fetch`);
      const messages = await fetchUnreadMessages(gmail);
      messageIdsToProcess = messages.map((m) => m.id!).filter(Boolean);
      // Get fresh historyId to seed for next sync
      newSyncCursor = await getCurrentHistoryId(gmail);
    }
  } else {
    // FIRST SYNC: No cursor yet — fetch unread and seed the cursor
    console.log(`[Email Sync] First sync for ${account.email}, fetching unread messages`);
    const messages = await fetchUnreadMessages(gmail);
    messageIdsToProcess = messages.map((m) => m.id!).filter(Boolean);
    // Seed the sync cursor for future incremental syncs
    newSyncCursor = await getCurrentHistoryId(gmail);
    console.log(`[Email Sync] Seeding sync_cursor: ${newSyncCursor}`);
  }

  if (messageIdsToProcess.length === 0) {
    console.log(`[Email Sync] No new messages, updating last_sync_at and sync_cursor`);
    await supabase
      .from("auth_accounts")
      .update({
        last_sync_at: new Date().toISOString(),
        ...(newSyncCursor ? { sync_cursor: newSyncCursor } : {}),
      })
      .eq("id", account.id);
    return;
  }

  console.log(`[Email Sync] Processing ${messageIdsToProcess.length} messages`);

  // Batch check which messages already exist (avoids N individual queries)
  const { data: existingEmails } = await supabase
    .from("emails_raw")
    .select("message_id")
    .eq("organization_id", organizationId)
    .in("message_id", messageIdsToProcess);

  const existingMessageIds = new Set(
    (existingEmails || []).map((e: { message_id: string }) => e.message_id)
  );

  const newMessageIds = messageIdsToProcess.filter((id) => !existingMessageIds.has(id));
  console.log(`[Email Sync] ${existingMessageIds.size} already ingested, ${newMessageIds.length} new`);

  // Phase 1: Ingest new messages sequentially (Gmail API rate limits)
  const ingestedEmails: any[] = [];

  for (const messageId of newMessageIds) {
    try {
      const details = await getMessageDetails(gmail, messageId);
      console.log(`[Email Sync] Ingesting: ${details.from.email} (${details.subject || 'no subject'})`);

      const { data: insertedEmail, error: insertError } = await supabase
        .from("emails_raw")
        .insert({
          organization_id: organizationId,
          auth_account_id: account.id,
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
        stats.errors.push(`Insert ${messageId}: ${insertError.message}`);
        continue;
      }

      stats.emailsIngested++;
      ingestedEmails.push(insertedEmail);

      // Add to suggested contacts if not already an LP or dismissed
      if (insertedEmail && details.from.email) {
        try {
          const { added } = await processEmailForSuggestedContact(supabase, organizationId, {
            id: insertedEmail.id,
            from_email: details.from.email,
            from_name: details.from.name,
          });
          if (added) {
            stats.suggestedContactsAdded++;
          }
        } catch (scErr: any) {
          console.error(`[Email Sync] Error checking suggested contact:`, scErr.message);
        }
      }
    } catch (err: any) {
      stats.errors.push(`Message ${messageId}: ${err.message}`);
    }
  }

  // Detect thread-based answers (GP replied via email client)
  if (ingestedEmails.length > 0) {
    try {
      const answered = await markThreadQuestionsAnswered(supabase, ingestedEmails, organizationId);
      if (answered > 0) {
        console.log(`[Email Sync] Marked ${answered} questions as answered via thread detection`);
      }
    } catch (err: any) {
      console.error(`[Email Sync] Answer detection error:`, err.message);
    }
  }

  console.log(`[Email Sync] Ingested ${ingestedEmails.length} emails, now parsing with AI in batches of ${AI_BATCH_SIZE}...`);

  // Phase 2: Parse all newly ingested emails with AI in parallel batches
  if (ingestedEmails.length > 0) {
    const parsingContext = await fetchParsingContext(supabase, organizationId);

    const { errors: batchErrors } = await processInBatches(
      ingestedEmails,
      async (email) => {
        const result = await parseEmailWithAI(supabase, email, organizationId, parsingContext);
        stats.emailsParsed++;
        if (result.detectedDealId) {
          console.log(`[Email Sync] Matched deal for email from ${email.from_email}`);
        }
        return result;
      },
      AI_BATCH_SIZE
    );

    for (const err of batchErrors) {
      const email = ingestedEmails[err.index];
      stats.errors.push(`Parse error for ${email.message_id}: ${err.error.message}`);
      console.error(`[Email Sync] Parse error for ${email.message_id}:`, err.error.message);
    }
  }

  // Update last_sync_at and sync_cursor
  await supabase
    .from("auth_accounts")
    .update({
      last_sync_at: new Date().toISOString(),
      ...(newSyncCursor ? { sync_cursor: newSyncCursor } : {}),
    })
    .eq("id", account.id);

  console.log(`[Email Sync] Account ${account.email} sync complete:`);
  console.log(`  - Messages from Gmail: ${messageIdsToProcess.length}`);
  console.log(`  - Already ingested: ${existingMessageIds.size}`);
  console.log(`  - New emails ingested: ${stats.emailsIngested}`);
  console.log(`  - Emails parsed with AI: ${stats.emailsParsed}`);
  console.log(`  - Suggested contacts added: ${stats.suggestedContactsAdded}`);
  console.log(`  - Errors: ${stats.errors.length}`);
  if (newSyncCursor) {
    console.log(`  - New sync_cursor: ${newSyncCursor}`);
  }
}

// Also allow POST for manual triggering (authenticated users)
export async function POST(request: NextRequest) {
  // For manual sync, verify user is authenticated
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Only sync the current user's accounts
    const result = await processInboxSync(user.id);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message, stats: { accountsProcessed: 0, emailsIngested: 0, emailsParsed: 0, suggestedContactsAdded: 0, errors: [] } },
      { status: 500 }
    );
  }
}
