import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { generateAuthUrl } from "@/lib/gmail/oauth";
import { randomBytes } from "crypto";

export async function GET() {
  // Verify user is authenticated
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Generate state for CSRF protection
  const state = randomBytes(32).toString("hex");

  // Store state in cookie
  const cookieStore = await cookies();
  cookieStore.set("gmail_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10, // 10 minutes
  });

  // Generate auth URL and redirect
  const authUrl = generateAuthUrl(state);

  return NextResponse.redirect(authUrl);
}
