import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get user's active org
    const { data: userData } = await supabase
      .from("users")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    const serviceClient = createServiceClient();

    let { data: memberships, error } = await serviceClient
      .from("user_organizations")
      .select("organization_id, role, organizations(id, name, domain)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (error) throw error;

    // Backfill: if user has an active org but no junction table entry, create it
    if ((!memberships || memberships.length === 0) && userData?.organization_id) {
      await serviceClient
        .from("user_organizations")
        .insert({
          user_id: user.id,
          organization_id: userData.organization_id,
          role: "member",
        });

      const { data: refetched } = await serviceClient
        .from("user_organizations")
        .select("organization_id, role, organizations(id, name, domain)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      memberships = refetched;
    }

    const organizations = (memberships || [])
      .filter((m: any) => m.organizations)
      .map((m: any) => ({
        id: m.organizations.id,
        name: m.organizations.name,
        domain: m.organizations.domain,
        role: m.role,
        isActive: m.organization_id === userData?.organization_id,
      }));

    return NextResponse.json({ organizations, activeOrgId: userData?.organization_id });
  } catch (error: any) {
    console.error("[User Orgs GET] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch organizations" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { organizationId } = await request.json();

    if (!organizationId || typeof organizationId !== "string") {
      return NextResponse.json({ error: "organizationId is required" }, { status: 400 });
    }

    const serviceClient = createServiceClient();

    // Verify user has membership in the target org
    const { data: membership, error: membershipError } = await serviceClient
      .from("user_organizations")
      .select("organization_id, role")
      .eq("user_id", user.id)
      .eq("organization_id", organizationId)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: "You are not a member of that organization" },
        { status: 403 }
      );
    }

    // Switch active org only (role lives in user_organizations)
    const { error: updateError } = await serviceClient
      .from("users")
      .update({ organization_id: membership.organization_id })
      .eq("id", user.id);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, activeOrgId: organizationId, role: membership.role });
  } catch (error: any) {
    console.error("[User Orgs PATCH] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to switch organization" },
      { status: 500 }
    );
  }
}
