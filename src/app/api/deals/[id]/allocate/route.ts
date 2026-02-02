import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
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

  try {
    const { relationshipId, amount } = await request.json();

    if (!relationshipId || !amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    // Update the relationship to allocated status
    const { error: updateError } = await supabase
      .from("deal_lp_relationships")
      .update({
        status: "allocated",
        allocated_amount: amount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", relationshipId)
      .eq("deal_id", dealId);

    if (updateError) {
      throw new Error(`Failed to allocate: ${updateError.message}`);
    }

    // Recalculate deal totals
    const { data: relationships } = await supabase
      .from("deal_lp_relationships")
      .select("allocated_amount, committed_amount, status")
      .eq("deal_id", dealId);

    const totalAllocated = relationships
      ?.filter((r) => r.status === "allocated")
      .reduce((sum, r) => sum + (r.allocated_amount || 0), 0) || 0;

    const totalCommitted = relationships
      ?.filter((r) => r.status === "committed" || r.status === "allocated")
      .reduce((sum, r) => sum + (r.committed_amount || r.allocated_amount || 0), 0) || 0;

    // Update deal totals
    const { error: dealUpdateError } = await supabase
      .from("deals")
      .update({
        total_committed: totalCommitted,
        updated_at: new Date().toISOString(),
      })
      .eq("id", dealId);

    if (dealUpdateError) {
      console.error("Failed to update deal totals:", dealUpdateError);
    }

    return NextResponse.json({
      success: true,
      totalAllocated,
      totalCommitted,
    });
  } catch (error: any) {
    console.error("[Allocate API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
