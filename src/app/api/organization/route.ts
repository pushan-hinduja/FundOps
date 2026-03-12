import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: userData } = await supabase
    .from("users")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!userData?.organization_id) {
    return NextResponse.json({ error: "No organization" }, { status: 400 });
  }

  const serviceClient = createServiceClient();
  const { data: membership } = await serviceClient
    .from("user_organizations")
    .select("role")
    .eq("user_id", user.id)
    .eq("organization_id", userData.organization_id)
    .single();

  if (membership?.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const orgId = userData.organization_id;

  try {
    // Clear organization_id for all users in this org
    await serviceClient
      .from("users")
      .update({ organization_id: null })
      .eq("organization_id", orgId);

    // Remove all user_organizations entries
    await serviceClient
      .from("user_organizations")
      .delete()
      .eq("organization_id", orgId);

    // Delete the organization itself
    const { error } = await serviceClient
      .from("organizations")
      .delete()
      .eq("id", orgId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Org DELETE] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete organization" },
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

  const { data: userData } = await supabase
    .from("users")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!userData?.organization_id) {
    return NextResponse.json({ error: "No organization" }, { status: 400 });
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
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  try {
    const { name, domain } = await request.json();

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Organization name is required" }, { status: 400 });
    }

    const { data: updatedOrg, error } = await supabase
      .from("organizations")
      .update({
        name: name.trim(),
        domain: domain?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userData.organization_id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ organization: updatedOrg });
  } catch (error: any) {
    console.error("[Org PATCH] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update organization" },
      { status: 500 }
    );
  }
}
