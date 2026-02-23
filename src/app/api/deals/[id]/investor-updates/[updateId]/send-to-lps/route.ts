import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGmailClient, sendNewEmail } from "@/lib/gmail/client";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; updateId: string }> }
) {
  const supabase = await createClient();
  const { id: dealId, updateId } = await params;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: userData } = await supabase
    .from("users")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!userData?.organization_id) {
    return NextResponse.json({ error: "No organization" }, { status: 400 });
  }

  // Fetch the investor update
  const { data: investorUpdate } = await supabase
    .from("investor_updates")
    .select("*")
    .eq("id", updateId)
    .eq("deal_id", dealId)
    .eq("organization_id", userData.organization_id)
    .single();

  if (!investorUpdate) {
    return NextResponse.json(
      { error: "Investor update not found" },
      { status: 404 }
    );
  }

  if (investorUpdate.status !== "response_received") {
    return NextResponse.json(
      { error: "This update has not received a response yet or has already been sent" },
      { status: 400 }
    );
  }

  if (!investorUpdate.response_body) {
    return NextResponse.json(
      { error: "No response content to send" },
      { status: 400 }
    );
  }

  // Fetch deal info
  const { data: deal } = await supabase
    .from("deals")
    .select("name, company_name")
    .eq("id", dealId)
    .single();

  if (!deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  // Fetch LP emails (committed and allocated LPs)
  const { data: lpRelationships } = await supabase
    .from("deal_lp_relationships")
    .select(`
      lp_contacts (
        email,
        name
      )
    `)
    .eq("deal_id", dealId)
    .in("status", ["committed", "allocated"]);

  if (!lpRelationships || lpRelationships.length === 0) {
    return NextResponse.json(
      { error: "No committed or allocated LPs found for this deal" },
      { status: 400 }
    );
  }

  const lpEmails = lpRelationships
    .map((r: any) => r.lp_contacts?.email)
    .filter((email: string | undefined): email is string => !!email);

  if (lpEmails.length === 0) {
    return NextResponse.json(
      { error: "No LP email addresses found" },
      { status: 400 }
    );
  }

  // Get auth account for sending
  const { data: authAccount } = await supabase
    .from("auth_accounts")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .eq("provider", "gmail")
    .single();

  if (!authAccount) {
    return NextResponse.json(
      { error: "No active Gmail account. Please connect Gmail in settings." },
      { status: 400 }
    );
  }

  // Send the investor update to all LPs
  const gmail = await getGmailClient(authAccount);
  const companyName = deal.company_name || deal.name;
  const subject = `Investor Update - ${companyName}`;
  const body = `Investor Update - ${companyName}

${investorUpdate.response_body}`;

  try {
    const result = await sendNewEmail(gmail, authAccount.email, {
      to: lpEmails,
      subject,
      body,
    });

    // Update the investor update record
    await supabase
      .from("investor_updates")
      .update({
        status: "sent_to_lps",
        lp_email_sent_at: new Date().toISOString(),
        lp_gmail_message_id: result.messageId,
        sent_by: user.id,
      })
      .eq("id", updateId);

    return NextResponse.json({
      success: true,
      lpCount: lpEmails.length,
      messageId: result.messageId,
    });
  } catch (err: any) {
    console.error("[Send to LPs API] Error:", err);
    return NextResponse.json(
      { error: "Failed to send update to LPs" },
      { status: 500 }
    );
  }
}
