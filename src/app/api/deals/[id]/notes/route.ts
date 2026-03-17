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

    const { data: notes, error } = await supabase
      .from("deal_notes")
      .select("*")
      .eq("deal_id", dealId)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Fetch user info
    const userIds = [...new Set((notes || []).map((n) => n.user_id))];
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

    const notesWithUsers = (notes || []).map((n) => ({
      ...n,
      users: usersMap[n.user_id] || null,
    }));

    return NextResponse.json({ notes: notesWithUsers });
  } catch (error) {
    console.error("Get notes error:", error);
    return NextResponse.json({ error: "Failed to get notes" }, { status: 500 });
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

    const { content } = await request.json();
    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("deal_notes")
      .insert({
        deal_id: dealId,
        user_id: user.id,
        content: content.trim(),
      })
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Attach user info
    const { data: userInfo } = await supabase
      .from("users")
      .select("id, name, email")
      .eq("id", user.id)
      .single();

    return NextResponse.json({ note: { ...data, users: userInfo } }, { status: 201 });
  } catch (error) {
    console.error("Add note error:", error);
    return NextResponse.json({ error: "Failed to add note" }, { status: 500 });
  }
}
