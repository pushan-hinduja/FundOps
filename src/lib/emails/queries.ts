import type { SupabaseClient } from "@supabase/supabase-js";

export interface EmailWithParsed {
  id: string;
  from_email: string;
  from_name: string | null;
  subject: string | null;
  received_at: string;
  emails_parsed?: Array<{
    intent: string | null;
    detected_lp_id: string | null;
    detected_deal_id: string | null;
    confidence_scores: any;
    entities: any;
    lp_contacts?: { name: string; firm: string | null } | null;
    deals?: { name: string } | null;
  }>;
}

/**
 * Fetch emails with parsed data for an organization
 * This is the shared data source for both inbox and suggested contacts
 * Ensures both pages use the same query and data structure
 */
export async function fetchEmailsWithParsed(
  supabase: SupabaseClient,
  organizationId: string,
  options?: {
    limit?: number;
  }
): Promise<EmailWithParsed[]> {
  const { limit = 1000 } = options || {};

  console.log(`[Email Query] Fetching emails for organization: ${organizationId}`);

  // First, check total emails in database for this org (for debugging)
  const { count: totalCount, error: countError } = await supabase
    .from("emails_raw")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId);

  if (countError) {
    console.error(`[Email Query] Error counting emails:`, countError);
  } else {
    console.log(`[Email Query] Total emails in database for org ${organizationId}: ${totalCount || 0}`);
  }

  // Also check if there are ANY emails in the table (for debugging)
  const { count: anyCount, error: anyError } = await supabase
    .from("emails_raw")
    .select("*", { count: "exact", head: true });

  if (!anyError) {
    console.log(`[Email Query] Total emails in entire emails_raw table: ${anyCount || 0}`);
  }

  // Check auth_accounts to see which accounts exist (for debugging)
  const { data: authAccounts, error: authError } = await supabase
    .from("auth_accounts")
    .select("id, email, user_id, is_active")
    .eq("is_active", true)
    .limit(10);

  if (!authError && authAccounts) {
    console.log(`[Email Query] Found ${authAccounts.length} active auth accounts`);
    // Get their organization_ids through users
    if (authAccounts.length > 0) {
      const userIds = authAccounts.map(a => a.user_id);
      const { data: users } = await supabase
        .from("users")
        .select("id, organization_id")
        .in("id", userIds);
      
      const userOrgMap = new Map(users?.map(u => [u.id, u.organization_id]) || []);
      console.log(`[Email Query] Auth accounts and their orgs:`, authAccounts.map(a => ({
        email: a.email,
        org_id: userOrgMap.get(a.user_id),
        matches: userOrgMap.get(a.user_id) === organizationId
      })));
    }
  }

  // Build the select query - always include entities for consistency
  // Both inbox and suggested contacts can use the same data structure
  const selectQuery = `
      id,
      from_email,
      from_name,
      subject,
      received_at,
      emails_parsed (
        intent,
        detected_lp_id,
        detected_deal_id,
        confidence_scores,
        entities,
        lp_contacts (name, firm),
        deals (name)
      )
    `;

  const { data: emails, error } = await supabase
    .from("emails_raw")
    .select(selectQuery)
    .eq("organization_id", organizationId)
    .order("received_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error(`[Email Query] Error fetching emails:`, error);
    throw new Error(`Failed to fetch emails: ${error.message}`);
  }

  console.log(`[Email Query] Successfully fetched ${emails?.length || 0} emails for organization ${organizationId}`);

  return (emails || []) as EmailWithParsed[];
}

