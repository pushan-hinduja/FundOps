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

    // Get user's org
    const { data: userData } = await supabase
      .from("users")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    // Fetch votes
    const { data: votes, error } = await supabase
      .from("deal_votes")
      .select("*")
      .eq("deal_id", dealId)
      .order("created_at", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Fetch all org members
    const orgId = userData?.organization_id;
    let allMembers: { id: string; name: string | null; email: string }[] = [];

    if (orgId) {
      const { data: memberLinks } = await supabase
        .from("user_organizations")
        .select("user_id")
        .eq("organization_id", orgId);

      const memberIds = (memberLinks || []).map((m) => m.user_id);
      if (memberIds.length > 0) {
        const { data: users } = await supabase
          .from("users")
          .select("id, name, email")
          .in("id", memberIds);
        allMembers = users || [];
      }
    }

    const membersMap: Record<string, { id: string; name: string | null; email: string }> = {};
    for (const m of allMembers) {
      membersMap[m.id] = m;
    }

    // Also look up any voters not in org members (e.g., users without user_organizations row)
    const missingVoterIds = (votes || [])
      .map((v) => v.user_id)
      .filter((uid) => !membersMap[uid]);

    if (missingVoterIds.length > 0) {
      const { data: extraUsers } = await supabase
        .from("users")
        .select("id, name, email")
        .in("id", missingVoterIds);
      for (const u of extraUsers || []) {
        membersMap[u.id] = u;
        // Also add them to allMembers so they don't show as missing
        allMembers.push(u);
      }
    }

    // Attach user info to votes
    const votesWithUsers = (votes || []).map((v) => ({
      ...v,
      users: membersMap[v.user_id] || null,
    }));

    // Find members who haven't voted
    const votedUserIds = new Set((votes || []).map((v) => v.user_id));
    const missingMembers = allMembers.filter((m) => !votedUserIds.has(m.id));

    return NextResponse.json({ votes: votesWithUsers, currentUserId: user.id, missingMembers });
  } catch (error) {
    console.error("Get votes error:", error);
    return NextResponse.json({ error: "Failed to get votes" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dealId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { vote, comment } = await request.json();

    if (!vote || !["up", "down", "sideways"].includes(vote)) {
      return NextResponse.json({ error: "Invalid vote value" }, { status: 400 });
    }

    // Upsert vote
    const { data, error } = await supabase
      .from("deal_votes")
      .upsert(
        {
          deal_id: dealId,
          user_id: user.id,
          vote,
          comment: comment || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "deal_id,user_id" }
      )
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Attach user info
    const { data: userInfo } = await supabase
      .from("users")
      .select("id, name, email")
      .eq("id", user.id)
      .single();

    return NextResponse.json({ vote: { ...data, users: userInfo } });
  } catch (error) {
    console.error("Submit vote error:", error);
    return NextResponse.json({ error: "Failed to submit vote" }, { status: 500 });
  }
}
