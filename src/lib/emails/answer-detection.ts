import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * After ingesting new emails, check if any are from connected accounts (GP users).
 * If so, mark unanswered questions in the same thread as answered.
 *
 * This handles the case where a GP replies to an LP's question via their
 * email client directly, without using the AI response feature.
 */
export async function markThreadQuestionsAnswered(
  supabase: SupabaseClient,
  ingestedEmails: Array<{ from_email: string; thread_id: string | null }>,
  organizationId: string
): Promise<number> {
  // Get all connected account emails for this org
  const { data: authAccounts } = await supabase
    .from("auth_accounts")
    .select("email")
    .eq("is_active", true);

  const connectedEmails = new Set(
    (authAccounts || []).map((a: { email: string }) => a.email.toLowerCase())
  );

  // Find thread_ids where the GP sent a message
  const gpThreadIds = new Set<string>();
  for (const email of ingestedEmails) {
    if (email.thread_id && connectedEmails.has(email.from_email.toLowerCase())) {
      gpThreadIds.add(email.thread_id);
    }
  }

  if (gpThreadIds.size === 0) return 0;

  // Find all emails in those threads
  const { data: threadEmails } = await supabase
    .from("emails_raw")
    .select("id")
    .eq("organization_id", organizationId)
    .in("thread_id", Array.from(gpThreadIds));

  if (!threadEmails?.length) return 0;

  const emailIds = threadEmails.map((e: { id: string }) => e.id);

  // Mark unanswered questions in those threads as answered
  const { data: updated } = await supabase
    .from("emails_parsed")
    .update({ is_answered: true })
    .in("email_id", emailIds)
    .eq("intent", "question")
    .eq("is_answered", false)
    .select("id");

  const count = updated?.length || 0;
  if (count > 0) {
    console.log(`[Answer Detection] Marked ${count} questions as answered via thread replies`);
  }

  return count;
}
