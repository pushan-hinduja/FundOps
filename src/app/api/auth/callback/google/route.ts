import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { exchangeCodeForTokens, getGmailUserEmail } from "@/lib/gmail/oauth";
import { encrypt } from "@/lib/utils/encryption";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // Handle error from Google
  if (error) {
    console.error("Gmail OAuth error:", error);
    return NextResponse.redirect(`${appUrl}/settings/email?error=oauth_denied`);
  }

  // Verify code exists
  if (!code) {
    return NextResponse.redirect(`${appUrl}/settings/email?error=no_code`);
  }

  // Verify state for CSRF protection
  const cookieStore = await cookies();
  const storedState = cookieStore.get("gmail_oauth_state")?.value;

  if (!state || state !== storedState) {
    return NextResponse.redirect(`${appUrl}/settings/email?error=invalid_state`);
  }

  // Clear the state cookie
  cookieStore.delete("gmail_oauth_state");

  // Verify user is authenticated
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${appUrl}/login?error=not_authenticated`);
  }

  try {
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // Get the Gmail address
    const gmailEmail = await getGmailUserEmail(tokens.accessToken);

    // Encrypt tokens before storing
    const encryptedAccessToken = encrypt(tokens.accessToken);
    const encryptedRefreshToken = encrypt(tokens.refreshToken);

    // Upsert auth account
    const { error: upsertError } = await supabase
      .from("auth_accounts")
      .upsert(
        {
          user_id: user.id,
          provider: "gmail",
          email: gmailEmail,
          access_token: encryptedAccessToken,
          refresh_token: encryptedRefreshToken,
          token_expires_at: tokens.expiresAt.toISOString(),
          is_active: true,
        },
        {
          onConflict: "user_id,provider,email",
        }
      );

    if (upsertError) {
      console.error("Error saving auth account:", upsertError);
      return NextResponse.redirect(`${appUrl}/settings/email?error=save_failed`);
    }

    // Success - redirect to settings
    return NextResponse.redirect(`${appUrl}/settings/email?success=gmail_connected`);
  } catch (err) {
    console.error("Gmail OAuth callback error:", err);
    const errorMessage = err instanceof Error ? err.message : "";
    const errorCode =
      errorMessage.includes("ENCRYPTION_KEY")
        ? "missing_encryption_key"
        : "token_exchange_failed";
    return NextResponse.redirect(`${appUrl}/settings/email?error=${errorCode}`);
  }
}
