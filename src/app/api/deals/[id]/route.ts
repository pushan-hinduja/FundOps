import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id: dealId } = await params;

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
    return NextResponse.json({ error: "No organization" }, { status: 400 });
  }

  try {
    const body = await request.json();

    // Verify deal belongs to user's organization
    const { data: existingDeal } = await supabase
      .from("deals")
      .select("id, organization_id")
      .eq("id", dealId)
      .single();

    if (!existingDeal || existingDeal.organization_id !== userData.organization_id) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    // Update deal
    const { data: updatedDeal, error: updateError } = await supabase
      .from("deals")
      .update({
        name: body.name,
        company_name: body.company_name,
        description: body.description,
        target_raise: body.target_raise,
        min_check_size: body.min_check_size,
        max_check_size: body.max_check_size,
        fee_percent: body.fee_percent,
        carry_percent: body.carry_percent,
        status: body.status,
        memo_url: body.memo_url,
        created_date: body.created_date,
        close_date: body.close_date,
        investment_stage: body.investment_stage,
        investment_type: body.investment_type,
        founder_email: body.founder_email,
        investor_update_frequency: body.investor_update_frequency,
        updated_at: new Date().toISOString(),
      })
      .eq("id", dealId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update deal: ${updateError.message}`);
    }

    return NextResponse.json({ success: true, deal: updatedDeal });
  } catch (error: any) {
    console.error("[Deal Update API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
