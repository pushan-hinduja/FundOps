import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchEmailsWithParsed } from "./queries";

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
  console.log(`  - Unique contacts found: ${contactMap.size}`);

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

