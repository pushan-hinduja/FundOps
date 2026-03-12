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

    return NextResponse.json({ members, currentUserId: userData.id });
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

    const serviceClient = createServiceClient();

    const { data: targetUser, error: findError } = await serviceClient
      .from("users")
      .select("id, email, name, organization_id")
      .eq("email", email.toLowerCase().trim())
      .single();

    if (findError || !targetUser) {
      return NextResponse.json(
        { error: "No user found with that email. They must sign up first." },
        { status: 404 }
      );
    }

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

    // Add to junction table only
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
    const { userId } = await request.json();

    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    if (userId === userData.id) {
      return NextResponse.json(
        { error: "You cannot remove yourself from the organization" },
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
