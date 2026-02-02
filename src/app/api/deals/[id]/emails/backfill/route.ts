import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseEmailWithAI } from "@/lib/ai/parser";

export const maxDuration = 300; // 5 minutes for backfill

/**
 * POST /api/deals/[id]/emails/backfill
 *
 * Re-parse ALL emails with AI to find emails that match this deal.
 * This will:
 * 1. Fetch all raw emails for the organization
 * 2. Re-run AI parser on each one
 * 3. AI will detect deal mentions and set detected_deal_id
 * 4. Emails matching this deal will then appear on the deal page
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: dealId } = await params;

    // Auth check
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

    // Verify deal belongs to org and get deal name for logging
    const { data: deal } = await supabase
      .from("deals")
      .select("id, name")
      .eq("id", dealId)
      .eq("organization_id", userData.organization_id)
      .single();

    if (!deal) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    console.log(`[Backfill] Starting backfill for deal: ${deal.name} (${dealId})`);

    // Fetch ALL raw emails for the organization
    const { data: rawEmails, error: fetchError } = await supabase
      .from("emails_raw")
      .select("*")
      .eq("organization_id", userData.organization_id)
      .order("received_at", { ascending: false })
      .limit(500); // Safety limit

    if (fetchError) {
      console.error("[Backfill] Error fetching emails:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch emails" },
        { status: 500 }
      );
    }

    if (!rawEmails || rawEmails.length === 0) {
      return NextResponse.json({
        message: "No emails found to process",
        processed: 0,
        matched: 0,
      });
    }

    console.log(`[Backfill] Found ${rawEmails.length} emails to process`);

    let processed = 0;
    let matched = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Process each email
    for (const email of rawEmails) {
      try {
        console.log(`[Backfill] Processing ${processed + 1}/${rawEmails.length}: ${email.from_email} - ${email.subject?.substring(0, 50) || '(no subject)'}`);

        // Parse with AI (upsert will handle existing records)
        const result = await parseEmailWithAI(
          supabase,
          email,
          userData.organization_id
        );

        processed++;

        // Check if this email matched to our deal
        if (result.detectedDealId === dealId) {
          matched++;
          console.log(`[Backfill] ✓ Matched to deal: ${email.subject}`);
        }

        // Log progress every 10 emails
        if (processed % 10 === 0) {
          console.log(`[Backfill] Progress: ${processed}/${rawEmails.length} processed, ${matched} matched to this deal`);
        }
      } catch (err: any) {
        errors.push(`${email.from_email}: ${err.message}`);
        console.error(`[Backfill] Error parsing email ${email.id}:`, err.message);
      }
    }

    console.log(`[Backfill] Complete! Processed: ${processed}, Matched: ${matched}, Errors: ${errors.length}`);

    return NextResponse.json({
      message: "Backfill complete",
      dealName: deal.name,
      processed,
      matched,
      total: rawEmails.length,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined, // Only first 10 errors
    });
  } catch (error: any) {
    console.error("[Backfill] Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
