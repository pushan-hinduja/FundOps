import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// GET: Fetch suggested contacts from database (contacts are updated by cron job)
export async function GET(request: NextRequest) {
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

  // Fetch suggested contacts
  const { data: contacts, error } = await supabase
    .from("suggested_contacts")
    .select("id, email, name, firm, title, phone, source_email_id")
    .eq("organization_id", userData.organization_id)
    .eq("is_dismissed", false)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching suggested contacts:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch suggested contacts" },
      { status: 500 }
    );
  }

  // Filter out anyone who has since been added to lp_contacts
  // (e.g., auto-created by the deal_lp trigger after AI parsing)
  if (contacts && contacts.length > 0) {
    const emails = contacts.map((c) => c.email.toLowerCase());
    const { data: existingLPs } = await supabase
      .from("lp_contacts")
      .select("email")
      .eq("organization_id", userData.organization_id)
      .in("email", emails);

    const lpEmails = new Set(
      (existingLPs || []).map((lp) => lp.email.toLowerCase())
    );

    const filtered = contacts.filter(
      (c) => !lpEmails.has(c.email.toLowerCase())
    );

    return NextResponse.json({ contacts: filtered });
  }

  return NextResponse.json({ contacts: contacts || [] });
}

// POST: Add suggested contact to LP table
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { contactId } = body;

  if (!contactId) {
    return NextResponse.json({ error: "contactId is required" }, { status: 400 });
  }

  const serviceSupabase = createServiceClient();

  try {
    // Get suggested contact
    const { data: suggestedContact, error: fetchError } = await serviceSupabase
      .from("suggested_contacts")
      .select("*")
      .eq("id", contactId)
      .single();

    if (fetchError || !suggestedContact) {
      return NextResponse.json({ error: "Suggested contact not found" }, { status: 404 });
    }

    // Get user's organization
    const { data: userData } = await supabase
      .from("users")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (!userData?.organization_id || userData.organization_id !== suggestedContact.organization_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Create LP contact
    const { error: insertError } = await serviceSupabase
      .from("lp_contacts")
      .insert({
        organization_id: suggestedContact.organization_id,
        name: suggestedContact.name,
        email: suggestedContact.email,
        firm: suggestedContact.firm,
        title: suggestedContact.title,
        phone: suggestedContact.phone,
      });

    if (insertError) {
      // Check if it's a duplicate (already exists)
      if (insertError.code === "23505") {
        // Just delete the suggested contact
        await serviceSupabase
          .from("suggested_contacts")
          .delete()
          .eq("id", contactId);
        return NextResponse.json({ message: "Contact already exists in LP table" });
      }
      throw insertError;
    }

    // Delete from suggested_contacts
    await serviceSupabase
      .from("suggested_contacts")
      .delete()
      .eq("id", contactId);

    return NextResponse.json({ message: "Contact added to LP table" });
  } catch (err: any) {
    console.error("Error adding contact:", err);
    return NextResponse.json(
      { error: err.message || "Failed to add contact" },
      { status: 500 }
    );
  }
}

// DELETE: Dismiss suggested contact
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const contactId = searchParams.get("id");

  if (!contactId) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const serviceSupabase = createServiceClient();

  try {
    // Get suggested contact to verify ownership
    const { data: suggestedContact } = await serviceSupabase
      .from("suggested_contacts")
      .select("organization_id")
      .eq("id", contactId)
      .single();

    if (!suggestedContact) {
      return NextResponse.json({ error: "Suggested contact not found" }, { status: 404 });
    }

    // Get user's organization
    const { data: userData } = await supabase
      .from("users")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (!userData?.organization_id || userData.organization_id !== suggestedContact.organization_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Mark as dismissed
    const { error: updateError } = await serviceSupabase
      .from("suggested_contacts")
      .update({ is_dismissed: true })
      .eq("id", contactId);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ message: "Contact dismissed" });
  } catch (err: any) {
    console.error("Error dismissing contact:", err);
    return NextResponse.json(
      { error: err.message || "Failed to dismiss contact" },
      { status: 500 }
    );
  }
}

