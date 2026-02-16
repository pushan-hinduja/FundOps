import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGmailClient, sendEmailReply } from "@/lib/gmail/client";

export async function POST(request: NextRequest) {
  try {
    const { emailId, responseText, question, dealId, aiGeneratedResponse, tone } = await request.json();

    if (!emailId || !responseText || !question || !dealId) {
      return NextResponse.json(
        { error: "emailId, responseText, question, and dealId are required" },
        { status: 400 }
      );
    }

    // Get Supabase client and user
    const supabase = await createClient();
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
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Fetch the original email
    const { data: email, error: emailError } = await supabase
      .from("emails_raw")
      .select("*")
      .eq("id", emailId)
      .eq("organization_id", userData.organization_id)
      .single();

    if (emailError || !email) {
      return NextResponse.json(
        { error: "Email not found" },
        { status: 404 }
      );
    }

    // Get the auth account for sending
    const { data: authAccount, error: authError } = await supabase
      .from("auth_accounts")
      .select("*")
      .eq("id", email.auth_account_id)
      .eq("is_active", true)
      .single();

    if (authError || !authAccount) {
      return NextResponse.json(
        { error: "No active Gmail account found. Please reconnect Gmail in settings." },
        { status: 400 }
      );
    }

    // Get Gmail client
    let gmail;
    try {
      gmail = await getGmailClient(authAccount);
    } catch (gmailError) {
      console.error("Failed to get Gmail client:", gmailError);
      return NextResponse.json(
        { error: "Failed to connect to Gmail. Please try reconnecting your account." },
        { status: 500 }
      );
    }

    // Prepare reply subject
    const originalSubject = email.subject || "(no subject)";
    const replySubject = originalSubject.startsWith("Re:")
      ? originalSubject
      : `Re: ${originalSubject}`;

    // Send the email
    let sendResult;
    try {
      sendResult = await sendEmailReply(gmail, authAccount.email, {
        to: email.from_email,
        subject: replySubject,
        body: responseText,
        inReplyTo: email.message_id ? `<${email.message_id}>` : undefined,
        references: email.message_id ? `<${email.message_id}>` : undefined,
        threadId: email.thread_id || undefined,
      });
    } catch (sendError: unknown) {
      const err = sendError as { response?: { status?: number } };
      console.error("Failed to send email:", sendError);

      // Check for permission error (403)
      if (err.response?.status === 403) {
        return NextResponse.json(
          {
            error: "Gmail send permission not granted. Please disconnect and reconnect your Gmail account to grant send permissions.",
            code: "PERMISSION_DENIED"
          },
          { status: 403 }
        );
      }

      return NextResponse.json(
        { error: "Failed to send email. Please try again." },
        { status: 500 }
      );
    }

    // Fetch deal context for the record
    const { data: deal } = await supabase
      .from("deals")
      .select("name, company_name, target_raise, fee_percent, carry_percent")
      .eq("id", dealId)
      .single();

    // Record the sent response in the database
    const { data: emailResponse, error: insertError } = await supabase
      .from("email_responses")
      .insert({
        organization_id: userData.organization_id,
        original_email_id: emailId,
        question_text: question,
        ai_generated_response: aiGeneratedResponse || responseText,
        final_response: responseText,
        sent_at: new Date().toISOString(),
        sent_by: user.id,
        gmail_message_id: sendResult.messageId,
        gmail_thread_id: sendResult.threadId,
        tone_used: tone || null,
        deal_context: deal ? {
          deal_id: dealId,
          deal_name: deal.name,
          company_name: deal.company_name,
          target_raise: deal.target_raise,
          fee_percent: deal.fee_percent,
          carry_percent: deal.carry_percent,
        } : null,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Failed to record email response:", insertError);
      // Don't fail the request - email was already sent
    }

    // Mark the question as answered in emails_parsed
    await supabase
      .from("emails_parsed")
      .update({ is_answered: true })
      .eq("email_id", emailId)
      .eq("intent", "question");

    return NextResponse.json({
      success: true,
      messageId: sendResult.messageId,
      threadId: sendResult.threadId,
      responseId: emailResponse?.id,
    });
  } catch (error) {
    console.error("Send email response error:", error);
    return NextResponse.json(
      { error: "Failed to send response" },
      { status: 500 }
    );
  }
}
