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

    // Fetch votes
    const { data: votes, error } = await supabase
      .from("deal_votes")
      .select("*")
      .eq("deal_id", dealId)
      .order("created_at", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Fetch user info for all voters from public users table
    const userIds = [...new Set((votes || []).map((v) => v.user_id))];
    let usersMap: Record<string, { id: string; name: string | null; email: string }> = {};

    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from("users")
        .select("id, name, email")
        .in("id", userIds);

      for (const u of users || []) {
        usersMap[u.id] = u;
      }
    }

    // Attach user info to votes
    const votesWithUsers = (votes || []).map((v) => ({
      ...v,
      users: usersMap[v.user_id] || null,
    }));

    return NextResponse.json({ votes: votesWithUsers, currentUserId: user.id });
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
