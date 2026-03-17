import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchEmailsWithParsed } from "./queries";

import { getAnthropicClient, MODEL_ID } from "../ai/anthropic";

// Patterns that indicate an automated/non-human email address
const AUTOMATED_LOCAL_PARTS = new Set([
  "noreply", "no-reply", "no_reply",
  "donotreply", "do-not-reply", "do_not_reply",
  "mailer-daemon", "postmaster",
  "notifications", "notification",
  "alerts", "alert",
  "updates", "update",
  "news", "newsletter",
  "info", "support", "help", "hello",
  "orders", "order", "billing", "invoice",
  "shipping", "delivery", "tracking",
  "feedback", "survey",
  "marketing", "promo", "promotions",
  "unsubscribe", "bounce",
  "system", "admin", "webmaster",
  "calendar", "events", "rsvp",
  "daemon", "automated", "bot",
  "team", "crew", "receipts",
]);

const AUTOMATED_DOMAIN_KEYWORDS = [
  "mail.", "calendar.", "notify.", "bounce.",
  "email.", "sender.", "mailer.", "campaign.",
];

const AUTOMATED_DOMAINS = new Set([
  "mailchimp.com", "sendgrid.net", "amazonses.com",
  "mailgun.org", "postmarkapp.com", "mandrillapp.com",
  "hubspot.com", "intercom.io", "zendesk.com",
  "freshdesk.com", "salesforce.com",
  "github.com", "gitlab.com", "atlassian.com",
  "slack.com", "notion.so", "linear.app",
  "google.com", "googlemail.com",
  "facebookmail.com", "linkedin.com",
  "stripe.com", "plaid.com",
  "vercel.com", "heroku.com", "netlify.com",
  "luma-mail.com", "calendly.com",
  "tryapollo.io", "apollo.io",
  "postman.com", "mail.postman.com",
]);

function isAutomatedEmail(email: string): boolean {
  const lower = email.toLowerCase();
  const atIdx = lower.indexOf("@");
  if (atIdx < 0) return false;

  const local = lower.slice(0, atIdx);
  const domain = lower.slice(atIdx + 1);

  // Check exact local part match
  const baseLocal = local.split("+")[0]; // strip plus-addressing
  if (AUTOMATED_LOCAL_PARTS.has(baseLocal)) return true;

  // Check if local part contains plus-addressed automated keywords
  if (local.includes("+")) {
    const plusPart = local.split("+")[0];
    if (AUTOMATED_LOCAL_PARTS.has(plusPart)) return true;
  }

  // Check if the name part looks like a service (no personal name pattern)
  // e.g., "vercelship", "antlerus" — single word, no first.last pattern
  if (domain && AUTOMATED_DOMAINS.has(domain)) return true;

  // Check domain subdomains (calendar.luma-mail.com, mail.postman.com)
  for (const kw of AUTOMATED_DOMAIN_KEYWORDS) {
    if (domain.startsWith(kw) || domain.includes("." + kw.replace(".", ""))) return true;
  }

  // Check root domain against known automated domains
  const domainParts = domain.split(".");
  if (domainParts.length > 2) {
    const rootDomain = domainParts.slice(-2).join(".");
    if (AUTOMATED_DOMAINS.has(rootDomain)) return true;
  }

  return false;
}

/**
 * Use AI to classify a batch of email addresses as human or automated.
 * Returns the set of emails classified as human.
 */
async function classifyEmailsWithAI(
  contacts: { email: string; name: string }[]
): Promise<Set<string>> {
  if (contacts.length === 0) return new Set();

  try {
    const client = getAnthropicClient();
    const contactList = contacts
      .map((c) => c.name + " <" + c.email + ">")
      .join("\n");

    const response = await client.messages.create({
      model: MODEL_ID,
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: [
            "I'm building a list of potential investor contacts from my email inbox. For each sender below, classify as HUMAN or AUTOMATED.",
            "",
            "AUTOMATED means: newsletters, notifications, receipts, order confirmations, marketing emails, service bots, noreply addresses, company announcements, or system-generated messages.",
            "",
            "HUMAN means: a real person who wrote a personal or business email. When in doubt, classify as HUMAN — it's better to include a borderline case than to miss a real investor contact.",
            "",
            "People at investment firms, startups, law firms, banks, or consulting firms are almost always HUMAN even if their name sounds corporate.",
            "",
            "Return ONLY a JSON array of the email addresses (lowercase) that are HUMAN. No explanation.",
            "",
            contactList,
          ].join("\n"),
        },
      ],
    });

    const text = response.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") return new Set(contacts.map((c) => c.email));

    const match = text.text.match(/\[[\s\S]*\]/);
    if (!match) return new Set(contacts.map((c) => c.email));

    const humanEmails: string[] = JSON.parse(match[0]);
    return new Set(humanEmails.map((e) => e.toLowerCase()));
  } catch (err) {
    console.error("[Suggested Contacts] AI classification error:", err);
    // On failure, include all — better to show false positives than miss real people
    return new Set(contacts.map((c) => c.email.toLowerCase()));
  }
}

export interface SuggestedContact {
  id: string;
  email: string;
  name: string;
  firm: string | null;
  title: string | null;
  phone: string | null;
  source_email_id: string;
}

/**
 * Process a single email for suggested contacts - called during cron
 * Only adds if email sender is not already an LP and not dismissed
 */
export async function processEmailForSuggestedContact(
  supabase: SupabaseClient,
  organizationId: string,
  email: {
    id: string;
    from_email: string;
    from_name: string | null;
  },
  parsedEntities?: { lp?: { name?: string; email?: string; firm?: string } }
): Promise<{ added: boolean; reason?: string }> {
  if (!email.from_email) {
    return { added: false, reason: "no_email" };
  }

  const emailLower = email.from_email.toLowerCase();

  // Skip non-human email addresses
  if (isAutomatedEmail(emailLower)) {
    return { added: false, reason: "automated_email" };
  }

  // Check if already in LP contacts
  const { data: existingLP } = await supabase
    .from("lp_contacts")
    .select("id")
    .eq("organization_id", organizationId)
    .ilike("email", emailLower)
    .single();

  if (existingLP) {
    return { added: false, reason: "already_lp" };
  }

  // Check if dismissed
  const { data: dismissed } = await supabase
    .from("suggested_contacts")
    .select("id")
    .eq("organization_id", organizationId)
    .ilike("email", emailLower)
    .eq("is_dismissed", true)
    .single();

  if (dismissed) {
    return { added: false, reason: "dismissed" };
  }

  // Upsert the suggested contact
  const { error } = await supabase
    .from("suggested_contacts")
    .upsert(
      {
        organization_id: organizationId,
        email: email.from_email,
        name: parsedEntities?.lp?.name || email.from_name || email.from_email,
        firm: parsedEntities?.lp?.firm || null,
        source_email_id: email.id,
        is_dismissed: false,
      },
      {
        onConflict: "organization_id,email",
        ignoreDuplicates: false,
      }
    );

  if (error) {
    console.error("Error upserting suggested contact:", error);
    return { added: false, reason: "error" };
  }

  return { added: true };
}

/**
 * Get suggested contacts from emails that aren't in LP table
 * Uses the same email data source as inbox page
 */
export async function getSuggestedContacts(
  supabase: SupabaseClient,
  organizationId: string
): Promise<SuggestedContact[]> {
  try {
    console.log(`[Suggested Contacts] Starting for organization: ${organizationId}`);
    
    // First verify we have emails in the database
    const { count: emailCount, error: countError } = await supabase
      .from("emails_raw")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId);
    
    if (countError) {
      console.error(`[Suggested Contacts] Error counting emails:`, countError);
    } else {
      console.log(`[Suggested Contacts] Total emails in emails_raw table for org: ${emailCount || 0}`);
    }
    
    // Fetch emails using shared query function
    const emails = await fetchEmailsWithParsed(supabase, organizationId, {
      limit: 1000,
    });

    console.log(`[Suggested Contacts] Fetched ${emails.length} emails from inbox`);
    
    if (emails.length === 0 && (emailCount || 0) > 0) {
      console.warn(`[Suggested Contacts] WARNING: Found ${emailCount} emails in DB but query returned 0. Possible RLS issue or organization_id mismatch.`);
    }

    // Get existing LP emails
    const { data: existingLPs, error: lpsError } = await supabase
      .from("lp_contacts")
      .select("email")
      .eq("organization_id", organizationId);

    if (lpsError) {
      console.error("Error fetching existing LPs:", lpsError);
      // Continue with empty set if we can't fetch LPs
    }

    const existingEmails = new Set(existingLPs?.map((lp) => lp.email.toLowerCase()) || []);
    console.log(`[Suggested Contacts] Found ${existingEmails.size} existing LP contacts`);

    // Get dismissed suggested contacts
    const { data: dismissedContacts, error: dismissedError } = await supabase
      .from("suggested_contacts")
      .select("email")
      .eq("organization_id", organizationId)
      .eq("is_dismissed", true);

    if (dismissedError) {
      console.error("Error fetching dismissed contacts:", dismissedError);
      // Continue with empty set if we can't fetch dismissed contacts
    }

    const dismissedEmails = new Set(dismissedContacts?.map((c) => c.email.toLowerCase()) || []);
    console.log(`[Suggested Contacts] Found ${dismissedEmails.size} dismissed contacts`);

  // Extract unique contacts from emails
  const contactMap = new Map<string, {
    email: string;
    name: string;
    firm: string | null;
    title: string | null;
    phone: string | null;
    source_email_id: string;
  }>();

  let skippedNoEmail = 0;
  let skippedExistingLP = 0;
  let skippedDismissed = 0;
  let contactsFound = 0;

  for (const email of emails) {
    if (!email.from_email) {
      skippedNoEmail++;
      continue;
    }

    const emailLower = email.from_email.toLowerCase();

    // Skip automated/non-human emails
    if (isAutomatedEmail(emailLower)) {
      continue;
    }

    // Skip if already in LP table or dismissed
    if (existingEmails.has(emailLower)) {
      skippedExistingLP++;
      continue;
    }

    if (dismissedEmails.has(emailLower)) {
      skippedDismissed++;
      continue;
    }

    // Use parsed data if available, otherwise use email headers
    const parsed = email.emails_parsed?.[0];
    const parsedLp = parsed?.entities?.lp;

    const contactInfo = {
      email: email.from_email,
      name: parsedLp?.name || email.from_name || email.from_email,
      firm: parsedLp?.firm || null,
      title: null as string | null,
      phone: null as string | null,
      source_email_id: email.id,
    };

    // Use the most recent/complete data for each email
    if (!contactMap.has(emailLower) || parsedLp?.name) {
      contactMap.set(emailLower, contactInfo);
      contactsFound++;
    }
  }

  console.log(`[Suggested Contacts] Processing summary:`);
  console.log(`  - Total emails processed: ${emails.length}`);
  console.log(`  - Skipped (no email): ${skippedNoEmail}`);
  console.log(`  - Skipped (already in LP table): ${skippedExistingLP}`);
  console.log(`  - Skipped (dismissed): ${skippedDismissed}`);
  console.log(`  - Unique contacts found (pre-AI): ${contactMap.size}`);

    // AI classification: filter out remaining automated emails
    if (contactMap.size > 0) {
      const candidates = Array.from(contactMap.values()).map((c) => ({
        email: c.email.toLowerCase(),
        name: c.name,
      }));
      const humanEmails = await classifyEmailsWithAI(candidates);

      let aiFiltered = 0;
      for (const [key, contact] of contactMap) {
        if (!humanEmails.has(contact.email.toLowerCase())) {
          contactMap.delete(key);
          aiFiltered++;
        }
      }
      console.log(`  - AI filtered out: ${aiFiltered} automated contacts`);
      console.log(`  - Final human contacts: ${contactMap.size}`);
    }

    // Upsert into suggested_contacts table
    const contactsToUpsert = Array.from(contactMap.values()).map((contact) => ({
      organization_id: organizationId,
      email: contact.email,
      name: contact.name,
      firm: contact.firm,
      title: contact.title,
      phone: contact.phone,
      source_email_id: contact.source_email_id,
      is_dismissed: false,
    }));

    console.log(`[Suggested Contacts] Upserting ${contactsToUpsert.length} contacts into database`);

    if (contactsToUpsert.length > 0) {
      const { error: upsertError } = await supabase
        .from("suggested_contacts")
        .upsert(contactsToUpsert, {
          onConflict: "organization_id,email",
          ignoreDuplicates: false,
        });

      if (upsertError) {
        console.error("Error upserting suggested contacts:", upsertError);
        // Continue even if upsert fails
      } else {
        console.log(`[Suggested Contacts] Successfully upserted ${contactsToUpsert.length} contacts`);
      }
    }

    // Clean out old entries that no longer pass the filter
    const validEmails = new Set(contactsToUpsert.map((c) => c.email.toLowerCase()));
    const { data: allStored } = await supabase
      .from("suggested_contacts")
      .select("id, email")
      .eq("organization_id", organizationId)
      .eq("is_dismissed", false);

    const idsToRemove = (allStored || [])
      .filter((c) => !validEmails.has(c.email.toLowerCase()))
      .map((c) => c.id);

    if (idsToRemove.length > 0) {
      await supabase
        .from("suggested_contacts")
        .delete()
        .in("id", idsToRemove);
      console.log(`[Suggested Contacts] Cleaned out ${idsToRemove.length} stale/automated entries`);
    }

    // Fetch all non-dismissed suggested contacts
    const { data: suggestedContacts, error: fetchError } = await supabase
      .from("suggested_contacts")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("is_dismissed", false)
      .order("created_at", { ascending: false });

    if (fetchError) {
      console.error("Error fetching suggested contacts:", fetchError);
      return [];
    }

    console.log(`[Suggested Contacts] Returning ${suggestedContacts?.length || 0} suggested contacts`);
    return (suggestedContacts || []) as SuggestedContact[];
  } catch (err) {
    console.error("Error in getSuggestedContacts:", err);
    // Return empty array on any error to prevent RSC payload failure
    return [];
  }
}

