import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGmailClient, sendEmailReply, getMessageRfcId } from "@/lib/gmail/client";

export async function POST(request: NextRequest) {
  try {
    const { emailId, responseText, question, questions: questionsArray, dealId, aiGeneratedResponse, tone } = await request.json();

    // Support both single question (legacy) and questions array
    const questions: string[] = questionsArray || (question ? [question] : []);

    if (!emailId || !responseText || questions.length === 0 || !dealId) {
      return NextResponse.json(
        { error: "emailId, responseText, questions, and dealId are required" },
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

    // Fetch the RFC Message-ID header for proper threading
    let rfcMessageId: string | null = null;
    if (email.message_id) {
      rfcMessageId = await getMessageRfcId(gmail, email.message_id);
    }

    // Build reply-all recipients: original sender as To, other recipients as CC
    const senderEmail = authAccount.email.toLowerCase();
    const toRecipient = email.from_email;

    // Collect all original to/cc minus our own email
    const originalTo: string[] = email.to_emails || [];
    const originalCc: string[] = email.cc_emails || [];
    const allOriginalRecipients = [...originalTo, ...originalCc];
    const ccRecipients = allOriginalRecipients.filter(
      (addr: string) =>
        addr.toLowerCase() !== senderEmail &&
        addr.toLowerCase() !== toRecipient.toLowerCase()
    );

    // Send the email
    let sendResult;
    try {
      sendResult = await sendEmailReply(gmail, authAccount.email, {
        to: toRecipient,
        subject: replySubject,
        body: responseText,
        cc: ccRecipients.length > 0 ? ccRecipients : undefined,
        inReplyTo: rfcMessageId || undefined,
        references: rfcMessageId || undefined,
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

    // Record the sent response in the database — one record per question
    const now = new Date().toISOString();
    const responseRecords = questions.map((q: string) => ({
      organization_id: userData.organization_id,
      original_email_id: emailId,
      question_text: q,
      ai_generated_response: aiGeneratedResponse || responseText,
      final_response: responseText,
      sent_at: now,
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
    }));

    const { data: emailResponses, error: insertError } = await supabase
      .from("email_responses")
      .insert(responseRecords)
      .select();

    if (insertError) {
      console.error("Failed to record email response:", insertError);
      // Don't fail the request - email was already sent
    }

    // Check if ALL extracted questions now have responses
    const { data: parsedEmail } = await supabase
      .from("emails_parsed")
      .select("extracted_questions")
      .eq("email_id", emailId)
      .eq("intent", "question")
      .single();

    const { data: allResponses } = await supabase
      .from("email_responses")
      .select("question_text")
      .eq("original_email_id", emailId);

    const answeredQuestions = new Set((allResponses || []).map((r: { question_text: string }) => r.question_text));
    const allExtracted = parsedEmail?.extracted_questions || [];
    const allAnswered = allExtracted.every((q: string) => answeredQuestions.has(q));

    if (allAnswered) {
      await supabase
        .from("emails_parsed")
        .update({ is_answered: true })
        .eq("email_id", emailId)
        .eq("intent", "question");
    }

    return NextResponse.json({
      success: true,
      messageId: sendResult.messageId,
      threadId: sendResult.threadId,
      responseId: emailResponses?.[0]?.id,
    });
  } catch (error) {
    console.error("Send email response error:", error);
    return NextResponse.json(
      { error: "Failed to send response" },
      { status: 500 }
    );
  }
}
