import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceClient = createServiceClient();

  const { data: userData, error } = await serviceClient
    .from("users")
    .select("name, email")
    .eq("id", user.id)
    .single();

  if (error) {
    return NextResponse.json({ user: { name: null, email: user.email } });
  }

  return NextResponse.json({ user: userData });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name, email } = await request.json();

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    if (!email || typeof email !== "string" || !email.trim()) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Use service client to bypass RLS — users without an org can't SELECT
    // themselves due to the org-scoped SELECT policy on the users table
    const serviceClient = createServiceClient();

    const { data: updatedUser, error } = await serviceClient
      .from("users")
      .update({
        name: name.trim(),
        email: email.trim(),
      })
      .eq("id", user.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ user: updatedUser });
  } catch (error: any) {
    console.error("[User Profile PATCH] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update profile" },
      { status: 500 }
    );
  }
}
