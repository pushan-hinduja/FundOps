import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/debug/backfill-suggested-contacts
 *
 * Simple approach: Find all unique email addresses in emails_raw
 * that are NOT in lp_contacts, and add them to suggested_contacts
 */
export async function POST() {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get user's organization
  const { data: userData } = await supabase
    .from("users")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!userData?.organization_id) {
    return NextResponse.json({ error: "No organization" }, { status: 400 });
  }

  const organizationId = userData.organization_id;

  try {
    // Get all unique email senders from emails_raw
    const { data: rawEmails, error: rawError } = await supabase
      .from("emails_raw")
      .select("id, from_email, from_name")
      .eq("organization_id", organizationId)
      .order("received_at", { ascending: false });

    if (rawError) {
      throw new Error(`Failed to fetch emails: ${rawError.message}`);
    }

    if (!rawEmails || rawEmails.length === 0) {
      return NextResponse.json({
        message: "No emails found",
        processed: 0,
      });
    }

    console.log(`[Backfill SC] Found ${rawEmails.length} emails`);

    // Get all LP emails for filtering
    const { data: lpContacts, error: lpError } = await supabase
      .from("lp_contacts")
      .select("email")
      .eq("organization_id", organizationId);

    if (lpError) {
      throw new Error(`Failed to fetch LP contacts: ${lpError.message}`);
    }

    const lpEmails = new Set(
      (lpContacts || []).map((lp) => lp.email.toLowerCase())
    );
    console.log(`[Backfill SC] Found ${lpEmails.size} existing LP contacts`);

    // Find unique email addresses NOT in LP database
    const uniqueEmails = new Map<
      string,
      { email: string; name: string; source_email_id: string }
    >();

    for (const email of rawEmails) {
      const emailLower = email.from_email.toLowerCase();

      // Skip if already an LP
      if (lpEmails.has(emailLower)) {
        continue;
      }

      // Add to map (keeps most recent email per sender)
      if (!uniqueEmails.has(emailLower)) {
        uniqueEmails.set(emailLower, {
          email: email.from_email,
          name: email.from_name || email.from_email.split("@")[0],
          source_email_id: email.id,
        });
      }
    }

    console.log(
      `[Backfill SC] Found ${uniqueEmails.size} unique non-LP email addresses`
    );

    // Upsert into suggested_contacts
    const contactsToUpsert = Array.from(uniqueEmails.values()).map(
      (contact) => ({
        organization_id: organizationId,
        email: contact.email,
        name: contact.name,
        firm: null,
        source_email_id: contact.source_email_id,
        is_dismissed: false,
      })
    );

    if (contactsToUpsert.length > 0) {
      const { error: upsertError } = await supabase
        .from("suggested_contacts")
        .upsert(contactsToUpsert, {
          onConflict: "organization_id,email",
          ignoreDuplicates: false,
        });

      if (upsertError) {
        throw new Error(
          `Failed to upsert suggested contacts: ${upsertError.message}`
        );
      }

      console.log(
        `[Backfill SC] Successfully upserted ${contactsToUpsert.length} suggested contacts`
      );
    }

    return NextResponse.json({
      message: "Backfill complete",
      totalEmails: rawEmails.length,
      lpContactsFound: lpEmails.size,
      suggestedContactsAdded: contactsToUpsert.length,
    });
  } catch (error: any) {
    console.error("[Backfill SC] Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
