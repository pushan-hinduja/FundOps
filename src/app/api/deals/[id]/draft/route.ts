import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dealId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
      .from("deal_draft_data")
      .select("*")
      .eq("deal_id", dealId)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ draft: data });
  } catch (error) {
    console.error("Get draft data error:", error);
    return NextResponse.json({ error: "Failed to get draft data" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dealId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();

    const allowedFields = [
      "valuation", "round_size", "revenue_current_year", "revenue_previous_year",
      "yoy_growth", "ebitda", "is_profitable", "team_notes",
    ];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = body[field];
      }
    }

    // Try update first, then insert if not exists
    const { data: existing } = await supabase
      .from("deal_draft_data")
      .select("id")
      .eq("deal_id", dealId)
      .maybeSingle();

    if (existing) {
      const { data, error } = await supabase
        .from("deal_draft_data")
        .update(updateData)
        .eq("deal_id", dealId)
        .select()
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ draft: data });
    } else {
      const { data, error } = await supabase
        .from("deal_draft_data")
        .insert({ deal_id: dealId, ...updateData })
        .select()
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ draft: data }, { status: 201 });
    }
  } catch (error) {
    console.error("Update draft data error:", error);
    return NextResponse.json({ error: "Failed to update draft data" }, { status: 500 });
  }
}
