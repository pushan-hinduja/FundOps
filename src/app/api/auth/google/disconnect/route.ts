import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get("id");

  if (!accountId) {
    return NextResponse.json({ error: "Account ID is required" }, { status: 400 });
  }

  const serviceSupabase = createServiceClient();

  // Verify the account belongs to this user
  const { data: account } = await serviceSupabase
    .from("auth_accounts")
    .select("id, user_id")
    .eq("id", accountId)
    .single();

  if (!account || account.user_id !== user.id) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  // Delete the account
  const { error } = await serviceSupabase
    .from("auth_accounts")
    .delete()
    .eq("id", accountId);

  if (error) {
    console.error("Error deleting auth account:", error);
    return NextResponse.json({ error: "Failed to disconnect account" }, { status: 500 });
  }

  return NextResponse.json({ message: "Account disconnected" });
}
