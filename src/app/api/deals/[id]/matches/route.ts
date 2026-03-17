import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { computeMatches } from "@/lib/ai/matching/compute-matches";

// GET /api/deals/[id]/matches — return cached match scores
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dealId } = await params;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: scores, error } = await supabase
      .from("lp_match_scores")
      .select("*, lp_contacts(id, name, email, firm, preferred_check_size, investor_type)")
      .eq("deal_id", dealId)
      .order("is_excluded", { ascending: true })
      .order("total_score", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ scores: scores || [] });
  } catch (error) {
    console.error("Get match scores error:", error);
    return NextResponse.json({ error: "Failed to get scores" }, { status: 500 });
  }
}

// POST /api/deals/[id]/matches — recompute match scores
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dealId } = await params;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify deal belongs to user's org
    const { data: userData } = await supabase
      .from("users")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (!userData?.organization_id) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const { data: deal } = await supabase
      .from("deals")
      .select("id, organization_id")
      .eq("id", dealId)
      .eq("organization_id", userData.organization_id)
      .single();

    if (!deal) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    const scores = await computeMatches({
      supabase,
      dealId,
      organizationId: userData.organization_id,
    });

    // Re-fetch with LP details for the response
    const { data: scoresWithLps } = await supabase
      .from("lp_match_scores")
      .select("*, lp_contacts(id, name, email, firm, preferred_check_size, investor_type)")
      .eq("deal_id", dealId)
      .order("is_excluded", { ascending: true })
      .order("total_score", { ascending: false });

    return NextResponse.json({
      scores: scoresWithLps || scores,
      computed: true,
    });
  } catch (error) {
    console.error("Compute match scores error:", error);
    return NextResponse.json({ error: "Failed to compute scores" }, { status: 500 });
  }
}
