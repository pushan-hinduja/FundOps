import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listSessions, createSession } from "@/lib/ai/agent/session";

// GET /api/ai/chat/sessions — list user's sessions
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

    const sessions = await listSessions({
      supabase,
      userId: user.id,
      organizationId: userData.organization_id,
    });

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error("List sessions error:", error);
    return NextResponse.json({ error: "Failed to list sessions" }, { status: 500 });
  }
}

// POST /api/ai/chat/sessions — create a new session
export async function POST(request: NextRequest) {
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

    // Optionally accept a title
    const body = await request.json().catch(() => ({}));

    const session = await createSession({
      supabase,
      userId: user.id,
      organizationId: userData.organization_id,
    });

    if (body.title) {
      await supabase
        .from("chat_sessions")
        .update({ title: body.title })
        .eq("id", session.id);
      session.title = body.title;
    }

    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    console.error("Create session error:", error);
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}
