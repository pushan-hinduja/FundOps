import { createServiceClient } from "@/lib/supabase/server";
import { getGmailClient, sendNewEmail } from "@/lib/gmail/client";
import type { gmail_v1 } from "googleapis";
import type { InvestorUpdateFrequency } from "@/lib/supabase/types";

type SupabaseServiceClient = ReturnType<typeof createServiceClient>;

/**
 * Calculate the next investor update due date based on close date and frequency.
 * Returns null if close_date or frequency is not set.
 */
export function getNextUpdateDate(
  closeDate: string,
  frequency: InvestorUpdateFrequency
): Date {
  const monthsInterval =
    frequency === "monthly"
      ? 1
      : frequency === "quarterly"
        ? 3
        : frequency === "semi_annual"
          ? 6
          : 12;

  const now = new Date();
  const nextDate = new Date(closeDate);

  // Advance from close date by the interval until we reach a future date
  while (nextDate <= now) {
    nextDate.setMonth(nextDate.getMonth() + monthsInterval);
  }

  return nextDate;
}

/**
 * Calculate all due dates that have passed but don't have investor_update records yet.
 */
function getDueDates(
  closeDate: string,
  frequency: InvestorUpdateFrequency,
  existingDueDates: Set<string>
): Date[] {
  const monthsInterval =
    frequency === "monthly"
      ? 1
      : frequency === "quarterly"
        ? 3
        : frequency === "semi_annual"
          ? 6
          : 12;

  const now = new Date();
  const dueDates: Date[] = [];
  const checkDate = new Date(closeDate);

  // Advance from close date and collect any due dates that are past
  while (true) {
    checkDate.setMonth(checkDate.getMonth() + monthsInterval);
    if (checkDate > now) break;

    const dateStr = checkDate.toISOString().split("T")[0];
    if (!existingDueDates.has(dateStr)) {
      dueDates.push(new Date(checkDate));
    }
  }

  return dueDates;
}

/**
 * Check all closed deals for due investor updates and create records.
 * Called during CRON processing.
 */
export async function checkAndCreateDueUpdates(
  supabase: SupabaseServiceClient,
  organizationId: string
): Promise<number> {
  // Fetch closed deals with investor update config
  const { data: deals, error: dealsError } = await supabase
    .from("deals")
    .select("id, close_date, founder_email, investor_update_frequency")
    .eq("organization_id", organizationId)
    .eq("status", "closed")
    .not("investor_update_frequency", "is", null)
    .not("founder_email", "is", null)
    .not("close_date", "is", null);

  if (dealsError || !deals || deals.length === 0) {
    return 0;
  }

  let createdCount = 0;

  for (const deal of deals) {
    // Get existing investor updates for this deal
    const { data: existingUpdates } = await supabase
      .from("investor_updates")
      .select("due_date, update_number")
      .eq("deal_id", deal.id)
      .order("update_number", { ascending: false });

    const existingDueDates = new Set(
      (existingUpdates || []).map((u: { due_date: string }) => u.due_date)
    );
    const maxUpdateNumber = existingUpdates?.[0]?.update_number || 0;

    // Find due dates that need records
    const dueDates = getDueDates(
      deal.close_date,
      deal.investor_update_frequency as InvestorUpdateFrequency,
      existingDueDates
    );

    // Create investor_update records for each due date
    for (let i = 0; i < dueDates.length; i++) {
      const dueDate = dueDates[i];
      const updateNumber = maxUpdateNumber + i + 1;

      const { error: insertError } = await supabase
        .from("investor_updates")
        .insert({
          organization_id: organizationId,
          deal_id: deal.id,
          update_number: updateNumber,
          status: "pending_request",
          due_date: dueDate.toISOString().split("T")[0],
        });

      if (!insertError) {
        createdCount++;
        console.log(
          `[Investor Updates] Created update #${updateNumber} for deal ${deal.id} (due: ${dueDate.toISOString().split("T")[0]})`
        );
      }
    }
  }

  return createdCount;
}

/**
 * Send update request emails for pending investor updates.
 * Called during CRON processing after checkAndCreateDueUpdates.
 */
export async function sendPendingUpdateRequests(
  supabase: SupabaseServiceClient,
  organizationId: string,
  gmail: gmail_v1.Gmail,
  authAccountEmail: string
): Promise<number> {
  // Get pending requests for this org
  const { data: pendingUpdates, error } = await supabase
    .from("investor_updates")
    .select(`
      id,
      deal_id,
      update_number,
      due_date,
      deals (
        name,
        company_name,
        founder_email
      )
    `)
    .eq("organization_id", organizationId)
    .eq("status", "pending_request");

  if (error || !pendingUpdates || pendingUpdates.length === 0) {
    return 0;
  }

  let sentCount = 0;

  for (const update of pendingUpdates) {
    const deal = update.deals as unknown as {
      name: string;
      company_name: string | null;
      founder_email: string;
    };

    if (!deal?.founder_email) continue;

    const companyName = deal.company_name || deal.name;
    const subject = `Investor Update Request - ${companyName}`;
    const body = `Hi,

We're reaching out to request an investor update for ${companyName}.

Could you please reply to this email with any updates, progress, key metrics, or news you'd like to share with our investor base?

Thank you!`;

    try {
      const result = await sendNewEmail(gmail, authAccountEmail, {
        to: deal.founder_email,
        subject,
        body,
      });

      // Update the record with sent info
      await supabase
        .from("investor_updates")
        .update({
          status: "request_sent",
          request_email_thread_id: result.threadId,
          request_email_message_id: result.messageId,
          request_sent_at: new Date().toISOString(),
        })
        .eq("id", update.id);

      sentCount++;
      console.log(
        `[Investor Updates] Sent update request #${update.update_number} for deal ${update.deal_id} to ${deal.founder_email}`
      );
    } catch (err: any) {
      console.error(
        `[Investor Updates] Failed to send request for update ${update.id}:`,
        err.message
      );
    }
  }

  return sentCount;
}

/**
 * Check newly ingested emails for responses to investor update requests.
 * Called during CRON email ingestion for each account.
 */
export async function detectUpdateResponses(
  supabase: SupabaseServiceClient,
  organizationId: string,
  newEmails: Array<{
    id: string;
    thread_id: string | null;
    from_email: string;
    body_text: string | null;
  }>
): Promise<number> {
  if (newEmails.length === 0) return 0;

  // Get thread IDs from new emails
  const threadIds = newEmails
    .map((e) => e.thread_id)
    .filter((tid): tid is string => tid !== null);

  if (threadIds.length === 0) return 0;

  // Check if any of these thread IDs match pending investor update requests
  const { data: pendingUpdates, error } = await supabase
    .from("investor_updates")
    .select("id, request_email_thread_id, deal_id, deals(founder_email)")
    .eq("organization_id", organizationId)
    .eq("status", "request_sent")
    .in("request_email_thread_id", threadIds);

  if (error || !pendingUpdates || pendingUpdates.length === 0) {
    return 0;
  }

  let detectedCount = 0;

  for (const update of pendingUpdates) {
    const deal = update.deals as unknown as { founder_email: string | null };
    // Find the matching email(s) in this thread that are FROM the founder (not from us)
    const responseEmail = newEmails.find(
      (e) =>
        e.thread_id === update.request_email_thread_id &&
        deal?.founder_email &&
        e.from_email.toLowerCase() === deal.founder_email.toLowerCase()
    );

    if (responseEmail) {
      await supabase
        .from("investor_updates")
        .update({
          status: "response_received",
          response_received_at: new Date().toISOString(),
          response_email_id: responseEmail.id,
          response_body: responseEmail.body_text,
        })
        .eq("id", update.id);

      detectedCount++;
      console.log(
        `[Investor Updates] Detected response for update ${update.id} in thread ${update.request_email_thread_id}`
      );
    }
  }

  return detectedCount;
}
