import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
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

  // Get user's organization
  const { data: userData } = await supabase
    .from("users")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!userData?.organization_id) {
    return NextResponse.json({ error: "No organization" }, { status: 400 });
  }

  // Verify deal belongs to user's org
  const { data: deal } = await supabase
    .from("deals")
    .select("id, organization_id")
    .eq("id", dealId)
    .eq("organization_id", userData.organization_id)
    .single();

  if (!deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  try {
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null;
    const userAgent = request.headers.get("user-agent") || null;

    const { error } = await supabase
      .from("deal_nda_acceptances")
      .upsert(
        {
          deal_id: dealId,
          user_id: user.id,
          accepted_at: new Date().toISOString(),
          ip_address: ip,
          user_agent: userAgent,
        },
        { onConflict: "deal_id,user_id" }
      );

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[NDA Accept] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to record NDA acceptance" },
      { status: 500 }
    );
  }
}
