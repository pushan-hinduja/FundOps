import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

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

  // Verify admin role
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
    const updates = await request.json();

    // Get current settings
    const { data: org } = await supabase
      .from("organizations")
      .select("settings")
      .eq("id", userData.organization_id)
      .single();

    const currentSettings = (org?.settings as Record<string, unknown>) || {};
    const newSettings = { ...currentSettings, ...updates };

    const { error } = await serviceClient
      .from("organizations")
      .update({
        settings: newSettings,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userData.organization_id);

    if (error) throw error;

    return NextResponse.json({ settings: newSettings });
  } catch (error: any) {
    console.error("[Org Settings PATCH] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update settings" },
      { status: 500 }
    );
  }
}
