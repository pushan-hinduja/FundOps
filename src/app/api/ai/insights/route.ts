import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/ai/insights — list active insights for user's org
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from("users")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (!userData?.organization_id) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("agent_insights")
      .select("*")
      .eq("organization_id", userData.organization_id)
      .eq("is_dismissed", false)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ insights: data || [] });
  } catch (error) {
    console.error("List insights error:", error);
    return NextResponse.json({ error: "Failed to list insights" }, { status: 500 });
  }
}

// PATCH /api/ai/insights — dismiss an insight
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { insightId } = await request.json();

    if (!insightId) {
      return NextResponse.json({ error: "insightId is required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("agent_insights")
      .update({
        is_dismissed: true,
        dismissed_by: user.id,
        dismissed_at: new Date().toISOString(),
      })
      .eq("id", insightId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Dismiss insight error:", error);
    return NextResponse.json({ error: "Failed to dismiss insight" }, { status: 500 });
  }
}
