import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceClient = createServiceClient();
  const userId = user.id;

  try {
    // Find organizations where this user is the sole member and delete them
    const { data: memberships } = await serviceClient
      .from("user_organizations")
      .select("organization_id")
      .eq("user_id", userId);

    if (memberships) {
      for (const m of memberships) {
        const { count } = await serviceClient
          .from("user_organizations")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", m.organization_id);

        if (count === 1) {
          // This user is the only member — delete the organization.
          // Clear organization_id for this user first (FK to organizations)
          await serviceClient
            .from("users")
            .update({ organization_id: null })
            .eq("organization_id", m.organization_id);

          // Remove user_organizations entries
          await serviceClient
            .from("user_organizations")
            .delete()
            .eq("organization_id", m.organization_id);

          // Delete the organization (cascades to deals, lp_contacts, etc.)
          await serviceClient
            .from("organizations")
            .delete()
            .eq("id", m.organization_id);
        }
      }
    }

    // Clean up foreign key references that don't have ON DELETE CASCADE/SET NULL.
    // These would block deletion of the auth.users row if left in place.

    // organization_invites.invited_by is NOT NULL, so delete the rows
    await serviceClient
      .from("organization_invites")
      .delete()
      .eq("invited_by", userId);

    // Nullable references — set to null
    await serviceClient
      .from("email_responses")
      .update({ sent_by: null })
      .eq("sent_by", userId);

    await serviceClient
      .from("agent_insights")
      .update({ dismissed_by: null })
      .eq("dismissed_by", userId);

    await serviceClient
      .from("lp_documents")
      .update({ verified_by: null })
      .eq("verified_by", userId);

    await serviceClient
      .from("lp_wiring_instructions")
      .update({ verified_by: null })
      .eq("verified_by", userId);

    // Clear the user's active organization reference
    await serviceClient
      .from("users")
      .update({ organization_id: null })
      .eq("id", userId);

    // Delete the auth user. This cascades to delete the users row and all
    // related rows in tables with ON DELETE CASCADE (user_organizations,
    // auth_accounts, chat_sessions, chat_messages, agent_memories,
    // user_settings, draft_deal_reviews, deal_nda_acceptances, deal_notes).
    const { error } = await serviceClient.auth.admin.deleteUser(userId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Account DELETE] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete account" },
      { status: 500 }
    );
  }
}
