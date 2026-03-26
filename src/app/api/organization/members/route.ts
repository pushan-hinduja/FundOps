import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

async function getAuthenticatedAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const { data: userData } = await supabase
    .from("users")
    .select("id, organization_id")
    .eq("id", user.id)
    .single();

  if (!userData?.organization_id) {
    return { error: NextResponse.json({ error: "No organization" }, { status: 400 }) };
  }

  // Get role from user_organizations (source of truth)
  const serviceClient = createServiceClient();
  const { data: membership } = await serviceClient
    .from("user_organizations")
    .select("role")
    .eq("user_id", user.id)
    .eq("organization_id", userData.organization_id)
    .single();

  if (membership?.role !== "admin") {
    return { error: NextResponse.json({ error: "Admin access required" }, { status: 403 }) };
  }

  return { supabase, userData };
}

export async function GET() {
  const result = await getAuthenticatedAdmin();
  if ("error" in result) return result.error;
  const { userData } = result;

  try {
    const serviceClient = createServiceClient();
    const { data: memberships, error } = await serviceClient
      .from("user_organizations")
      .select("user_id, role")
      .eq("organization_id", userData.organization_id)
      .order("created_at", { ascending: true });

    if (error) throw error;

    const userIds = (memberships || []).map((m: any) => m.user_id);

    let members: any[] = [];
    if (userIds.length > 0) {
      const { data: users } = await serviceClient
        .from("users")
        .select("id, name, email")
        .in("id", userIds);

      const userMap = new Map((users || []).map((u: any) => [u.id, u]));
      members = (memberships || [])
        .filter((m: any) => userMap.has(m.user_id))
        .map((m: any) => ({
          ...userMap.get(m.user_id),
          role: m.role,
        }));
    }

    // Fetch pending invites for this organization
    const { data: pendingInvites } = await serviceClient
      .from("organization_invites")
      .select("id, email, role, created_at")
      .eq("organization_id", userData.organization_id)
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    return NextResponse.json({
      members,
      pendingInvites: pendingInvites || [],
      currentUserId: userData.id,
    });
  } catch (error: any) {
    console.error("[Org Members GET] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch members" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const result = await getAuthenticatedAdmin();
  if ("error" in result) return result.error;
  const { userData } = result;

  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const serviceClient = createServiceClient();

    // Check if user already exists in our users table
    const { data: targetUser } = await serviceClient
      .from("users")
      .select("id, email, name, organization_id")
      .eq("email", normalizedEmail)
      .single();

    if (targetUser) {
      // User exists — add them directly (existing flow)
      const { data: existingMembership } = await serviceClient
        .from("user_organizations")
        .select("id")
        .eq("user_id", targetUser.id)
        .eq("organization_id", userData.organization_id)
        .single();

      if (existingMembership) {
        return NextResponse.json(
          { error: "User is already in your organization" },
          { status: 400 }
        );
      }

      const { error: junctionError } = await serviceClient
        .from("user_organizations")
        .insert({
          user_id: targetUser.id,
          organization_id: userData.organization_id,
          role: "member",
        });

      if (junctionError) throw junctionError;

      // If user has no active org, set this one as active
      if (!targetUser.organization_id) {
        await serviceClient
          .from("users")
          .update({ organization_id: userData.organization_id })
          .eq("id", targetUser.id);
      }

      return NextResponse.json({
        member: { id: targetUser.id, name: targetUser.name, email: targetUser.email, role: "member" },
      });
    }

    // User doesn't exist — send invite
    // Check for existing pending invite
    const { data: existingInvite } = await serviceClient
      .from("organization_invites")
      .select("id")
      .eq("email", normalizedEmail)
      .eq("organization_id", userData.organization_id)
      .eq("status", "pending")
      .single();

    if (existingInvite) {
      return NextResponse.json(
        { error: "An invite has already been sent to this email" },
        { status: 400 }
      );
    }

    // Get organization name for the invite email template
    const { data: org } = await serviceClient
      .from("organizations")
      .select("name")
      .eq("id", userData.organization_id)
      .single();

    const orgName = org?.name || "your organization";
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const redirectTo = `${appUrl}/auth/callback?next=${encodeURIComponent("/reset-password?invite=true")}`;

    // Send invite via Supabase Admin API
    // The invite email template can use {{ .Data.invited_org_name }} to show the org name
    const { error: inviteError } = await serviceClient.auth.admin.inviteUserByEmail(
      normalizedEmail,
      {
        data: {
          invited_org_id: userData.organization_id,
          invited_org_name: orgName,
        },
        redirectTo,
      }
    );

    if (inviteError) {
      console.error("[Org Members POST] Invite error:", inviteError);
      // User may already exist in auth.users but not in our users table
      if (inviteError.message?.includes("already been registered") || inviteError.message?.includes("already exists")) {
        return NextResponse.json(
          { error: "This email is already registered. Ask them to sign in, then you can add them." },
          { status: 400 }
        );
      }
      throw inviteError;
    }

    // Create invite record
    const { data: invite, error: insertError } = await serviceClient
      .from("organization_invites")
      .insert({
        organization_id: userData.organization_id,
        email: normalizedEmail,
        role: "member",
        invited_by: userData.id,
      })
      .select("id, email, role, created_at")
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({ invite });
  } catch (error: any) {
    console.error("[Org Members POST] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to add member" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const result = await getAuthenticatedAdmin();
  if ("error" in result) return result.error;
  const { userData } = result;

  try {
    const { userId, role } = await request.json();

    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    if (!role || !["admin", "member"].includes(role)) {
      return NextResponse.json({ error: "Role must be 'admin' or 'member'" }, { status: 400 });
    }

    if (userId === userData.id) {
      return NextResponse.json(
        { error: "You cannot change your own role" },
        { status: 400 }
      );
    }

    const serviceClient = createServiceClient();
    const { data: membership } = await serviceClient
      .from("user_organizations")
      .select("id")
      .eq("user_id", userId)
      .eq("organization_id", userData.organization_id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: "User not found in your organization" }, { status: 404 });
    }

    // Update role in junction table only (source of truth)
    const { error: updateError } = await serviceClient
      .from("user_organizations")
      .update({ role })
      .eq("user_id", userId)
      .eq("organization_id", userData.organization_id);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Org Members PATCH] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update role" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const result = await getAuthenticatedAdmin();
  if ("error" in result) return result.error;
  const { userData } = result;

  try {
    const { userId, inviteId } = await request.json();

    const serviceClient = createServiceClient();

    // Cancel a pending invite
    if (inviteId) {
      const { error: deleteError } = await serviceClient
        .from("organization_invites")
        .delete()
        .eq("id", inviteId)
        .eq("organization_id", userData.organization_id)
        .eq("status", "pending");

      if (deleteError) throw deleteError;

      return NextResponse.json({ success: true });
    }

    // Remove an existing member
    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ error: "userId or inviteId is required" }, { status: 400 });
    }

    if (userId === userData.id) {
      return NextResponse.json(
        { error: "You cannot remove yourself from the organization" },
        { status: 400 }
      );
    }

    const { data: membership } = await serviceClient
      .from("user_organizations")
      .select("id")
      .eq("user_id", userId)
      .eq("organization_id", userData.organization_id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: "User not found in your organization" }, { status: 404 });
    }

    // Remove from junction table
    await serviceClient
      .from("user_organizations")
      .delete()
      .eq("user_id", userId)
      .eq("organization_id", userData.organization_id);

    // If this was their active org, switch to another or clear
    const { data: targetUser } = await serviceClient
      .from("users")
      .select("organization_id")
      .eq("id", userId)
      .single();

    if (targetUser?.organization_id === userData.organization_id) {
      const { data: otherMembership } = await serviceClient
        .from("user_organizations")
        .select("organization_id")
        .eq("user_id", userId)
        .limit(1)
        .single();

      await serviceClient
        .from("users")
        .update({ organization_id: otherMembership?.organization_id || null })
        .eq("id", userId);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Org Members DELETE] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to remove member" },
      { status: 500 }
    );
  }
}
