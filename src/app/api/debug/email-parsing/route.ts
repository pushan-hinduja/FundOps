import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/debug/email-parsing
 *
 * Diagnostic endpoint to check email parsing status
 */
export async function GET() {
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
  const diagnostics: any = {
    organizationId,
    timestamp: new Date().toISOString(),
    checks: {},
  };

  // 1. Check if new columns exist in emails_parsed
  try {
    const { data: sampleParsed, error: parsedError } = await supabase
      .from("emails_parsed")
      .select("id, parsing_method, extracted_questions")
      .limit(1)
      .single();

    if (parsedError && parsedError.code === "PGRST116") {
      diagnostics.checks.migration = {
        status: "✅ PASSED",
        message: "No parsed emails yet (table is empty)",
      };
    } else if (parsedError) {
      diagnostics.checks.migration = {
        status: "❌ FAILED",
        message: `Migration likely NOT run - Error: ${parsedError.message}`,
        hint: "Run migration 018_add_ai_parsing_fields.sql",
      };
    } else {
      diagnostics.checks.migration = {
        status: "✅ PASSED",
        message: "Migration appears to be run - new columns exist",
      };
    }
  } catch (err: any) {
    diagnostics.checks.migration = {
      status: "❌ FAILED",
      message: `Error checking migration: ${err.message}`,
    };
  }

  // 2. Count emails in emails_raw
  const { count: rawCount } = await supabase
    .from("emails_raw")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId);

  diagnostics.checks.emails_raw = {
    status: rawCount && rawCount > 0 ? "✅ PASSED" : "❌ FAILED",
    count: rawCount || 0,
    message:
      rawCount && rawCount > 0
        ? `Found ${rawCount} raw emails`
        : "No emails in database - sync may have failed",
  };

  // 3. Count emails in emails_parsed
  const { count: parsedCount } = await supabase
    .from("emails_parsed")
    .select("*", { count: "exact", head: true });

  diagnostics.checks.emails_parsed = {
    status: parsedCount && parsedCount > 0 ? "✅ PASSED" : "⚠️ WARNING",
    count: parsedCount || 0,
    message:
      parsedCount && parsedCount > 0
        ? `Found ${parsedCount} parsed emails`
        : "No parsed emails - parsing may be failing",
  };

  // 4. Check parsing methods breakdown (if migration run)
  try {
    const { data: parsingBreakdown } = await supabase
      .from("emails_parsed")
      .select("parsing_method");

    if (parsingBreakdown) {
      const breakdown = parsingBreakdown.reduce((acc: any, email: any) => {
        const method = email.parsing_method || "unknown";
        acc[method] = (acc[method] || 0) + 1;
        return acc;
      }, {});

      diagnostics.checks.parsing_breakdown = {
        status: "ℹ️ INFO",
        breakdown,
        message: `Parsing methods: ${JSON.stringify(breakdown)}`,
      };
    }
  } catch (err) {
    // Skip if column doesn't exist
  }

  // 5. Count suggested contacts
  const { count: suggestedCount } = await supabase
    .from("suggested_contacts")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("is_dismissed", false);

  diagnostics.checks.suggested_contacts = {
    status: suggestedCount && suggestedCount > 0 ? "✅ PASSED" : "⚠️ WARNING",
    count: suggestedCount || 0,
    message:
      suggestedCount && suggestedCount > 0
        ? `Found ${suggestedCount} suggested contacts`
        : "No suggested contacts found",
  };

  // 6. Count LP contacts
  const { count: lpCount } = await supabase
    .from("lp_contacts")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId);

  diagnostics.checks.lp_contacts = {
    status: "ℹ️ INFO",
    count: lpCount || 0,
    message: `${lpCount || 0} LP contacts in database`,
  };

  // 7. Sample recent parsed emails with deal detection
  const { data: sampleEmails } = await supabase
    .from("emails_parsed")
    .select(
      `
      id,
      detected_lp_id,
      detected_deal_id,
      intent,
      processing_status,
      emails_raw (
        from_email,
        subject
      )
    `
    )
    .order("parsed_at", { ascending: false })
    .limit(5);

  diagnostics.checks.recent_emails = {
    status: "ℹ️ INFO",
    count: sampleEmails?.length || 0,
    samples: sampleEmails?.map((e: any) => ({
      from: e.emails_raw?.from_email,
      subject: e.emails_raw?.subject,
      has_lp: !!e.detected_lp_id,
      has_deal: !!e.detected_deal_id,
      intent: e.intent,
      status: e.processing_status,
    })),
  };

  // 8. Count deals
  const { count: dealCount } = await supabase
    .from("deals")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .in("status", ["draft", "active"]);

  diagnostics.checks.active_deals = {
    status: "ℹ️ INFO",
    count: dealCount || 0,
    message: `${dealCount || 0} active/draft deals available for matching`,
  };

  // Summary
  const failedChecks = Object.values(diagnostics.checks).filter(
    (check: any) => check.status === "❌ FAILED"
  ).length;

  diagnostics.summary = {
    status: failedChecks === 0 ? "HEALTHY" : "ISSUES_FOUND",
    failedChecks,
    recommendation:
      failedChecks > 0
        ? "See failed checks above for issues to resolve"
        : "System appears healthy - check recent_emails for parsing results",
  };

  return NextResponse.json(diagnostics, { status: 200 });
}
