import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceClient = createServiceClient();

  // Ensure the users row exists
  const metadata = user.user_metadata || {};
  await serviceClient
    .from("users")
    .upsert(
      {
        id: user.id,
        email: user.email!,
        name: metadata.full_name || null,
      },
      { onConflict: "id", ignoreDuplicates: false }
    );

  // Process pending invites for this email
  const { data: pendingInvites } = await serviceClient
    .from("organization_invites")
    .select("id, organization_id, role")
    .eq("email", user.email!)
    .eq("status", "pending");

  if (!pendingInvites || pendingInvites.length === 0) {
    return NextResponse.json({ error: "No pending invites found" }, { status: 404 });
  }

  for (const invite of pendingInvites) {
    // Add user to the organization
    await serviceClient
      .from("user_organizations")
      .upsert(
        {
          user_id: user.id,
          organization_id: invite.organization_id,
          role: invite.role,
        },
        { onConflict: "user_id,organization_id" }
      );

    // Mark invite as accepted
    await serviceClient
      .from("organization_invites")
      .update({
        status: "accepted",
        accepted_at: new Date().toISOString(),
      })
      .eq("id", invite.id);
  }

  // Set the first invited org as active if user has no active org
  const { data: currentUser } = await serviceClient
    .from("users")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!currentUser?.organization_id) {
    await serviceClient
      .from("users")
      .update({ organization_id: pendingInvites[0].organization_id })
      .eq("id", user.id);
  }

  return NextResponse.json({ success: true });
}
