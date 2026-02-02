import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGmailClient, fetchNewMessages, getMessageDetails } from "@/lib/gmail/client";
import { parseEmailWithAI } from "@/lib/ai/parser";
import type { AuthAccount } from "@/lib/supabase/types";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

/**
 * POST /api/debug/test-ai-parsing
 *
 * Test AI parsing on the latest email from Gmail inbox (not cached)
 */
export async function POST() {
  const supabase = await createClient();

  // Get current user
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

  const organizationId = userData.organization_id;

  try {
    // Get Gmail auth account
    const { data: authAccount, error: authError } = await supabase
      .from("auth_accounts")
      .select("*")
      .eq("user_id", user.id)
      .eq("provider", "gmail")
      .eq("is_active", true)
      .single();

    if (authError || !authAccount) {
      return NextResponse.json(
        { error: "No Gmail account connected" },
        { status: 400 }
      );
    }

    // Get Gmail client and fetch latest message
    const gmail = await getGmailClient(authAccount as AuthAccount);
    const messages = await fetchNewMessages(gmail, undefined, 1);

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: "No emails found in Gmail inbox" },
        { status: 404 }
      );
    }

    // Get full message details
    const messageDetails = await getMessageDetails(gmail, messages[0].id!);

    // Create a temporary email object for testing
    // Note: This will be stored in the database by parseEmailWithAI
    const testEmailId = randomUUID();

    // Insert test email into emails_raw
    const { data: insertedEmail, error: insertError } = await supabase
      .from("emails_raw")
      .insert({
        id: testEmailId,
        organization_id: organizationId,
        auth_account_id: authAccount.id,
        message_id: messageDetails.id,
        thread_id: messageDetails.threadId,
        from_email: messageDetails.from.email,
        from_name: messageDetails.from.name,
        to_emails: messageDetails.to,
        cc_emails: messageDetails.cc,
        subject: messageDetails.subject,
        body_text: messageDetails.bodyText,
        body_html: messageDetails.bodyHtml,
        received_at: messageDetails.receivedAt.toISOString(),
        has_attachments: messageDetails.hasAttachments,
      })
      .select()
      .single();

    if (insertError || !insertedEmail) {
      return NextResponse.json(
        { error: `Failed to insert test email: ${insertError?.message}` },
        { status: 500 }
      );
    }

    const email = insertedEmail;

    console.log(`[Test AI] Testing AI parsing on latest Gmail email from: ${email.from_email}`);
    console.log(`[Test AI] Subject: ${email.subject}`);
    console.log(`[Test AI] Received at: ${email.received_at}`);

    // Parse with AI (without storing in database)
    const startTime = Date.now();
    const result = await parseEmailWithAI(supabase, email, organizationId);
    const duration = Date.now() - startTime;

    console.log(`[Test AI] Parsing completed in ${duration}ms`);
    console.log(`[Test AI] Result:`, JSON.stringify(result, null, 2));

    return NextResponse.json({
      success: true,
      source: "Gmail (latest email fetched and parsed)",
      duration: `${duration}ms`,
      email: {
        id: email.id,
        from: email.from_email,
        subject: email.subject,
        receivedAt: email.received_at,
        body_preview: email.body_text?.substring(0, 200) + "...",
      },
      parseResult: result,
    });
  } catch (error: any) {
    console.error("[Test AI] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}
