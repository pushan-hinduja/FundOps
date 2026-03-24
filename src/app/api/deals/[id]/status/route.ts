import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const VALID_STATUSES = ["draft", "active", "closed", "archived"];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id: dealId } = await params;

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

  try {
    const body = await request.json();
    const { status } = body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // Verify deal belongs to user's organization
    const { data: existingDeal } = await supabase
      .from("deals")
      .select("id, organization_id")
      .eq("id", dealId)
      .single();

    if (!existingDeal || existingDeal.organization_id !== userData.organization_id) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    const { data: updatedDeal, error: updateError } = await supabase
      .from("deals")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", dealId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update status: ${updateError.message}`);
    }

    return NextResponse.json({ success: true, deal: updatedDeal });
  } catch (error: any) {
    console.error("[Deal Status Update] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update status" },
      { status: 500 }
    );
  }
}
