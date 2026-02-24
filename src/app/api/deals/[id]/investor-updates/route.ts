import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGmailClient, sendNewEmail } from "@/lib/gmail/client";

// GET: Fetch all investor updates for a deal
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id: dealId } = await params;

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

  // Verify deal belongs to org
  const { data: deal } = await supabase
    .from("deals")
    .select("id")
    .eq("id", dealId)
    .eq("organization_id", userData.organization_id)
    .single();

  if (!deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  const { data: updates, error } = await supabase
    .from("investor_updates")
    .select("*")
    .eq("deal_id", dealId)
    .eq("organization_id", userData.organization_id)
    .order("due_date", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ updates: updates || [] });
}

// POST: Manually trigger an investor update request
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id: dealId } = await params;

  // Parse optional body from request
  let customBody: string | undefined;
  try {
    const json = await request.json();
    customBody = json.body;
  } catch {
    // No body provided (empty request), that's fine
  }

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

  // Fetch deal with required fields
  const { data: deal, error: dealError } = await supabase
    .from("deals")
    .select("id, name, company_name, founder_email, investor_update_frequency, close_date, status, organization_id")
    .eq("id", dealId)
    .eq("organization_id", userData.organization_id)
    .single();

  if (dealError) {
    console.error("[Investor Updates API] Deal query error:", dealError);
    return NextResponse.json({ error: `Deal query failed: ${dealError.message}` }, { status: 500 });
  }

  if (!deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  if (deal.status !== "closed") {
    return NextResponse.json(
      { error: "Investor updates are only available for closed deals" },
      { status: 400 }
    );
  }

  if (!deal.founder_email) {
    return NextResponse.json(
      { error: "Founder email is not set for this deal" },
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

  // Get next update number
  const { data: lastUpdate } = await supabase
    .from("investor_updates")
    .select("update_number")
    .eq("deal_id", dealId)
    .order("update_number", { ascending: false })
    .limit(1)
    .single();

  const updateNumber = (lastUpdate?.update_number || 0) + 1;

  // Send the email
  const gmail = await getGmailClient(authAccount);
  const companyName = deal.company_name || deal.name;
  const subject = `Investor Update Request - ${companyName}`;
  const body = customBody || `Hi,

We're reaching out to request an investor update for ${companyName}.

Could you please reply to this email with any updates, progress, key metrics, or news you'd like to share with our investor base?

Thank you!`;

  try {
    const result = await sendNewEmail(gmail, authAccount.email, {
      to: deal.founder_email,
      subject,
      body,
    });

    // Create the investor update record
    const { data: investorUpdate, error: insertError } = await supabase
      .from("investor_updates")
      .insert({
        organization_id: userData.organization_id,
        deal_id: dealId,
        update_number: updateNumber,
        status: "request_sent",
        due_date: new Date().toISOString().split("T")[0],
        request_email_thread_id: result.threadId,
        request_email_message_id: result.messageId,
        request_sent_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error("[Investor Updates API] Insert error:", insertError);
      return NextResponse.json(
        { error: "Email sent but failed to create record" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      update: investorUpdate,
      messageId: result.messageId,
    });
  } catch (err: any) {
    console.error("[Investor Updates API] Send error:", err);
    return NextResponse.json(
      { error: "Failed to send update request email" },
      { status: 500 }
    );
  }
}
