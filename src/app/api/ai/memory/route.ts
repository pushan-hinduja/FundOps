import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/ai/memory — list user's memories
export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get("category");
    const search = searchParams.get("search");

    let query = supabase
      .from("agent_memories")
      .select("*")
      .eq("user_id", user.id)
      .eq("organization_id", userData.organization_id)
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(50);

    if (category) {
      query = query.eq("category", category);
    }

    if (search) {
      query = query.ilike("content", "%" + search + "%");
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ memories: data || [] });
  } catch (error) {
    console.error("List memories error:", error);
    return NextResponse.json({ error: "Failed to list memories" }, { status: 500 });
  }
}

// DELETE /api/ai/memory — deactivate a memory
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { memoryId } = await request.json();

    if (!memoryId) {
      return NextResponse.json({ error: "memoryId is required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("agent_memories")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", memoryId)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete memory error:", error);
    return NextResponse.json({ error: "Failed to delete memory" }, { status: 500 });
  }
}
