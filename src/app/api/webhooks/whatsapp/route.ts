import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { parseEmailWithAI } from "@/lib/ai/parser";

/**
 * POST /api/webhooks/whatsapp
 *
 * Receives forwarded WhatsApp group messages from the Baileys gateway.
 * Inserts into emails_raw (as source "whatsapp") so they flow through
 * the same AI parsing pipeline as Gmail messages.
 *
 * Expected payload:
 *   { from, group, text, timestamp, pushName, messageId }
 */
export async function POST(request: NextRequest) {
  // Authenticate via shared secret
  const webhookSecret = process.env.WA_WEBHOOK_SECRET;
  if (webhookSecret) {
    const auth = request.headers.get("authorization") || "";
    if (auth !== `Bearer ${webhookSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const body = await request.json();
  const { from, group, text, timestamp, pushName, messageId } = body;

  if (!text || !messageId) {
    return NextResponse.json({ error: "Missing text or messageId" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Get the organization — for now use the first org (single-tenant)
  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .limit(1)
    .single();

  if (!org) {
    return NextResponse.json({ error: "No organization found" }, { status: 500 });
  }

  // Dedup by message_id
  const { data: existing } = await supabase
    .from("emails_raw")
    .select("id")
    .eq("organization_id", org.id)
    .eq("message_id", `wa_${messageId}`)
    .single();

  if (existing) {
    return NextResponse.json({ status: "duplicate", id: existing.id });
  }

  // Insert as emails_raw so it flows through the same AI parsing pipeline
  const receivedAt = timestamp
    ? new Date(Number(timestamp) * 1000).toISOString()
    : new Date().toISOString();

  const { data: inserted, error: insertError } = await supabase
    .from("emails_raw")
    .insert({
      organization_id: org.id,
      auth_account_id: "whatsapp",
      message_id: `wa_${messageId}`,
      thread_id: `wa_group_${group}`,
      from_email: from,
      from_name: pushName || null,
      to_emails: [],
      cc_emails: [],
      subject: `WhatsApp: ${pushName || from}`,
      body_text: text,
      body_html: null,
      received_at: receivedAt,
      has_attachments: false,
    })
    .select()
    .single();

  if (insertError) {
    console.error("[WhatsApp Webhook] Insert failed:", insertError.message);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Run AI parsing (same pipeline as email)
  try {
    await parseEmailWithAI(supabase, inserted, org.id);
  } catch (err) {
    console.error("[WhatsApp Webhook] AI parse failed:", (err as Error).message);
    // Non-fatal — message is still stored
  }

  return NextResponse.json({ status: "ok", id: inserted.id });
}
