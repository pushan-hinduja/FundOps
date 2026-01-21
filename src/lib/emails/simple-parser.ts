import type { SupabaseClient } from "@supabase/supabase-js";

interface EmailInput {
  id: string;
  from_email: string;
  from_name: string | null;
  subject: string | null;
  body_text: string | null;
  received_at: string;
}

interface Deal {
  id: string;
  name: string;
  company_name: string | null;
}

interface LP {
  id: string;
  name: string;
  email: string;
  firm: string | null;
}

export interface SimpleParseResult {
  detectedLpId: string | null;
  detectedDealId: string | null;
  lpCreated: boolean;
  lpMatched: boolean;
  extractedLp: {
    name: string;
    email: string;
    firm: string | null;
  };
}

/**
 * Simple regex-based email parser - no AI required
 * - Matches sender to existing LPs by email
 * - Matches deals by name/company in subject or body
 * - Extracts LP info from email headers
 */
export async function parseEmailSimple(
  supabase: SupabaseClient,
  email: EmailInput,
  organizationId: string
): Promise<SimpleParseResult> {
  // Fetch known LPs and deals for matching
  const [lpsResult, dealsResult] = await Promise.all([
    supabase
      .from("lp_contacts")
      .select("id, name, email, firm")
      .eq("organization_id", organizationId)
      .limit(500),
    supabase
      .from("deals")
      .select("id, name, company_name")
      .eq("organization_id", organizationId)
      .in("status", ["draft", "active"])
      .limit(100),
  ]);

  const lps: LP[] = lpsResult.data || [];
  const deals: Deal[] = dealsResult.data || [];

  // Extract LP info from email headers
  const extractedLp = extractLpFromHeaders(email.from_email, email.from_name);

  // Try to match to existing LP by email
  let detectedLpId: string | null = null;
  let lpMatched = false;
  let lpCreated = false;

  const emailLower = email.from_email.toLowerCase();
  const matchedLp = lps.find((lp) => lp.email.toLowerCase() === emailLower);

  if (matchedLp) {
    detectedLpId = matchedLp.id;
    lpMatched = true;
  }

  // Try to match deal by name in subject or body
  let detectedDealId: string | null = null;
  const searchText = `${email.subject || ""} ${email.body_text || ""}`.toLowerCase();

  for (const deal of deals) {
    // Create regex patterns for deal name and company name
    const dealNamePattern = createSearchPattern(deal.name);
    const companyPattern = deal.company_name ? createSearchPattern(deal.company_name) : null;

    if (dealNamePattern.test(searchText) || (companyPattern && companyPattern.test(searchText))) {
      detectedDealId = deal.id;
      break;
    }
  }

  // Create parse record in database
  const { error: insertError } = await supabase.from("emails_parsed").insert({
    email_id: email.id,
    detected_lp_id: detectedLpId,
    detected_deal_id: detectedDealId,
    intent: "neutral", // Default to neutral without AI
    processing_status: "success",
    model_version: "simple-regex-v1",
    entities: {
      lp: extractedLp,
      parsing_method: "regex",
    },
    confidence_scores: {
      lp: lpMatched ? 1.0 : 0.5,
      deal: detectedDealId ? 0.8 : 0.0,
      intent: 0.0,
      amount: 0.0,
    },
    parsed_at: new Date().toISOString(),
  });

  if (insertError) {
    console.error("[Simple Parser] Error saving parse result:", insertError);
  }

  // Update LP last_interaction_at if matched
  if (detectedLpId) {
    await supabase
      .from("lp_contacts")
      .update({ last_interaction_at: email.received_at })
      .eq("id", detectedLpId);
  }

  return {
    detectedLpId,
    detectedDealId,
    lpCreated,
    lpMatched,
    extractedLp,
  };
}

/**
 * Extract LP info from email headers
 */
function extractLpFromHeaders(
  fromEmail: string,
  fromName: string | null
): { name: string; email: string; firm: string | null } {
  // Try to extract firm from email domain
  let firm: string | null = null;
  const domain = fromEmail.split("@")[1];
  if (domain && !isCommonEmailDomain(domain)) {
    // Use domain as potential firm name (capitalize)
    firm = domain.split(".")[0].charAt(0).toUpperCase() + domain.split(".")[0].slice(1);
  }

  return {
    name: fromName || fromEmail.split("@")[0],
    email: fromEmail,
    firm,
  };
}

/**
 * Check if domain is a common email provider
 */
function isCommonEmailDomain(domain: string): boolean {
  const commonDomains = [
    "gmail.com",
    "yahoo.com",
    "hotmail.com",
    "outlook.com",
    "icloud.com",
    "aol.com",
    "mail.com",
    "protonmail.com",
    "live.com",
    "msn.com",
  ];
  return commonDomains.includes(domain.toLowerCase());
}

/**
 * Create a flexible search pattern for matching deal/company names
 */
function createSearchPattern(name: string): RegExp {
  // Escape special regex characters and create word boundary pattern
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Match the name with word boundaries, case insensitive
  return new RegExp(`\\b${escaped}\\b`, "i");
}
