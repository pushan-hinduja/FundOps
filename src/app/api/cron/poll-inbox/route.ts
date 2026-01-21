import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getGmailClient, fetchNewMessages, getMessageDetails } from "@/lib/gmail/client";
import { parseEmailWithAI } from "@/lib/ai/parser";
import type { AuthAccount } from "@/lib/supabase/types";

export const maxDuration = 60; // Maximum execution time in seconds

export async function GET(request: NextRequest) {
  // Verify cron secret (Vercel sends this in header for cron jobs)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // In production, verify the cron secret
  if (process.env.NODE_ENV === "production" && cronSecret) {
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const supabase = createServiceClient();
  const stats = {
    accountsProcessed: 0,
    emailsIngested: 0,
    emailsParsed: 0,
    errors: [] as string[],
  };

  try {
    // Get all active auth accounts
    const { data: authAccounts, error: accountsError } = await supabase
      .from("auth_accounts")
      .select("*, users!inner(organization_id)")
      .eq("is_active", true)
      .eq("provider", "gmail");

    if (accountsError) {
      throw new Error(`Failed to fetch auth accounts: ${accountsError.message}`);
    }

    if (!authAccounts || authAccounts.length === 0) {
      return NextResponse.json({
        message: "No active Gmail accounts to poll",
        stats,
      });
    }

    // Process each account
    for (const account of authAccounts) {
      try {
        await processAccount(supabase, account as AuthAccount & { users: { organization_id: string } }, stats);
        stats.accountsProcessed++;
      } catch (err: any) {
        stats.errors.push(`Account ${account.email}: ${err.message}`);
      }
    }

    return NextResponse.json({
      message: "Email polling complete",
      stats,
    });
  } catch (err: any) {
    console.error("Cron job error:", err);
    return NextResponse.json(
      { error: err.message, stats },
      { status: 500 }
    );
  }
}

async function processAccount(
  supabase: ReturnType<typeof createServiceClient>,
  account: AuthAccount & { users: { organization_id: string } },
  stats: { emailsIngested: number; emailsParsed: number; errors: string[] }
) {
  const gmail = await getGmailClient(account);

  // Determine start time for fetching messages
  const afterTimestamp = account.last_sync_at
    ? new Date(account.last_sync_at)
    : new Date(Date.now() - 24 * 60 * 60 * 1000); // Default to last 24 hours

  // Fetch new messages
  const messages = await fetchNewMessages(gmail, afterTimestamp, 50);

  if (messages.length === 0) {
    // Update last_sync_at even if no new messages
    await supabase
      .from("auth_accounts")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("id", account.id);
    return;
  }

  const organizationId = account.users.organization_id;

  // Process each message
  for (const message of messages) {
    if (!message.id) continue;

    try {
      // Check if message already exists (deduplication)
      const { data: existing } = await supabase
        .from("emails_raw")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("message_id", message.id)
        .single();

      if (existing) {
        continue; // Skip already ingested messages
      }

      // Get full message details
      const details = await getMessageDetails(gmail, message.id);

      // Insert into emails_raw
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
        throw new Error(`Insert failed: ${insertError.message}`);
      }

      stats.emailsIngested++;

      // Parse the email with AI
      if (insertedEmail) {
        try {
          await parseEmailWithAI(supabase, insertedEmail, organizationId);
          stats.emailsParsed++;
        } catch (parseErr: any) {
          stats.errors.push(`Parse error for ${message.id}: ${parseErr.message}`);
        }
      }
    } catch (err: any) {
      stats.errors.push(`Message ${message.id}: ${err.message}`);
    }
  }

  // Update last_sync_at
  await supabase
    .from("auth_accounts")
    .update({ last_sync_at: new Date().toISOString() })
    .eq("id", account.id);
}

// Also allow POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request);
}
