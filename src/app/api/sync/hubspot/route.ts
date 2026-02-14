import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { fetchHubSpotContacts } from "@/lib/hubspot/client";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  // Verify user is authenticated
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

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
    return NextResponse.json({ error: "No organization found" }, { status: 400 });
  }

  // Get HubSpot API key from request body or environment
  const body = await request.json().catch(() => ({}));
  const apiKey = body.apiKey || process.env.HUBSPOT_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "HubSpot API key is required. Provide it in the request body or set HUBSPOT_API_KEY environment variable." },
      { status: 400 }
    );
  }

  const serviceSupabase = createServiceClient();
  const stats = {
    contactsFetched: 0,
    contactsCreated: 0,
    contactsUpdated: 0,
    errors: [] as string[],
  };

  try {
    // Fetch contacts from HubSpot
    const hubspotContacts = await fetchHubSpotContacts(apiKey);
    stats.contactsFetched = hubspotContacts.length;

    if (hubspotContacts.length === 0) {
      return NextResponse.json({
        message: "No contacts found in HubSpot",
        stats,
      });
    }

    // Get existing LPs to check for updates
    const { data: existingLPs } = await serviceSupabase
      .from("lp_contacts")
      .select("id, email")
      .eq("organization_id", userData.organization_id);

    const existingEmails = new Set(existingLPs?.map((lp) => lp.email) || []);

    // Process each HubSpot contact
    for (const contact of hubspotContacts) {
      try {
        if (existingEmails.has(contact.email)) {
          // Update existing LP
          const { error: updateError } = await serviceSupabase
            .from("lp_contacts")
            .update({
              name: contact.name,
              firm: contact.firm,
              title: contact.title,
              phone: contact.phone,
              updated_at: new Date().toISOString(),
            })
            .eq("organization_id", userData.organization_id)
            .eq("email", contact.email);

          if (updateError) {
            stats.errors.push(`Failed to update ${contact.email}: ${updateError.message}`);
          } else {
            stats.contactsUpdated++;
          }
        } else {
          // Create new LP
          const { error: insertError } = await serviceSupabase
            .from("lp_contacts")
            .insert({
              organization_id: userData.organization_id,
              name: contact.name,
              email: contact.email,
              firm: contact.firm,
              title: contact.title,
              phone: contact.phone,
            });

          if (insertError) {
            stats.errors.push(`Failed to create ${contact.email}: ${insertError.message}`);
          } else {
            stats.contactsCreated++;
          }
        }
      } catch (err: any) {
        stats.errors.push(`Error processing ${contact.email}: ${err.message}`);
      }
    }

    return NextResponse.json({
      message: "HubSpot sync complete",
      stats,
    });
  } catch (err: any) {
    console.error("HubSpot sync error:", err);
    return NextResponse.json(
      {
        error: err.message || "Failed to sync HubSpot contacts",
        stats,
      },
      { status: 500 }
    );
  }
}




