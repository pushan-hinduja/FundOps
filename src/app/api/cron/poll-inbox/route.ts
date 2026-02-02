import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getGmailClient, fetchUnreadMessages, getMessageDetails } from "@/lib/gmail/client";
import { parseEmailWithAI } from "@/lib/ai/parser";
import { processEmailForSuggestedContact } from "@/lib/emails/suggested-contacts";
import type { AuthAccount } from "@/lib/supabase/types";

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

  // Fetch only UNREAD messages (more efficient than fetching all)
  console.log(`[Email Sync] Fetching UNREAD messages...`);
  const messages = await fetchUnreadMessages(gmail);
  console.log(`[Email Sync] Found ${messages.length} unread messages from Gmail`);

  if (messages.length === 0) {
    console.log(`[Email Sync] No new messages, updating last_sync_at`);
    // Update last_sync_at even if no new messages
    await supabase
      .from("auth_accounts")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("id", account.id);
    return;
  }

  const organizationId = account.users.organization_id;
  let duplicateCount = 0;

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
        duplicateCount++;
        continue; // Skip already ingested messages
      }

      // Get full message details
      const details = await getMessageDetails(gmail, message.id);
      console.log(`[Email Sync] Processing email from: ${details.from.email} (${details.subject || 'no subject'})`);

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
      console.log(`[Email Sync] Ingested email ${stats.emailsIngested}/${messages.length} from ${details.from.email}`);

      // SIMPLE CHECK: Add to suggested contacts if not in LP database
      if (insertedEmail && details.from.email) {
        try {
          // Check if email exists in lp_contacts
          const { data: existingLP } = await supabase
            .from("lp_contacts")
            .select("id")
            .eq("organization_id", organizationId)
            .ilike("email", details.from.email)
            .single();

          // If NOT in LP database, add to suggested contacts
          if (!existingLP) {
            const { error: suggestError } = await supabase
              .from("suggested_contacts")
              .upsert(
                {
                  organization_id: organizationId,
                  email: details.from.email,
                  name: details.from.name || details.from.email.split("@")[0],
                  firm: null,
                  source_email_id: insertedEmail.id,
                  is_dismissed: false,
                },
                {
                  onConflict: "organization_id,email",
                  ignoreDuplicates: false,
                }
              );

            if (!suggestError) {
              stats.suggestedContactsAdded++;
              console.log(`[Email Sync] Added suggested contact: ${details.from.email}`);
            }
          } else {
            console.log(`[Email Sync] Email ${details.from.email} already in LP database, skipping suggested contact`);
          }
        } catch (scErr: any) {
          console.error(`[Email Sync] Error checking suggested contact:`, scErr.message);
        }
      }

      // Parse the email with AI
      if (insertedEmail) {
        try {
          const parseResult = await parseEmailWithAI(supabase, insertedEmail, organizationId);
          stats.emailsParsed++;

          if (parseResult.detectedDealId) {
            console.log(`[Email Sync] Matched deal for email from ${details.from.email}`);
          }
        } catch (parseErr: any) {
          stats.errors.push(`Parse error for ${message.id}: ${parseErr.message}`);
          console.error(`[Email Sync] Parse error for ${message.id}:`, parseErr.message);
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

  console.log(`[Email Sync] Account ${account.email} sync complete:`);
  console.log(`  - Messages from Gmail: ${messages.length}`);
  console.log(`  - Duplicates skipped: ${duplicateCount}`);
  console.log(`  - New emails ingested: ${stats.emailsIngested}`);
  console.log(`  - Emails parsed with AI: ${stats.emailsParsed}`);
  console.log(`  - Suggested contacts added: ${stats.suggestedContactsAdded}`);
  console.log(`  - Errors: ${stats.errors.length}`);
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
