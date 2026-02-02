import type { SupabaseClient } from "@supabase/supabase-js";
import type { LPContext, DealContext } from "./types";

/**
 * Fetch active deals for AI parsing context
 * TODO: Add caching later if needed (unstable_cache has issues with Supabase client)
 */
export async function getCachedDeals(
  supabase: SupabaseClient,
  organizationId: string
): Promise<DealContext[]> {
  const { data, error } = await supabase
    .from("deals")
    .select("id, name, company_name, status")
    .eq("organization_id", organizationId)
    .in("status", ["draft", "active"])
    .limit(100);

  if (error) {
    console.error("Error fetching deals for AI context:", error);
    return [];
  }

  return data || [];
}

/**
 * Fetch LP contacts for AI parsing context
 * TODO: Add caching later if needed (unstable_cache has issues with Supabase client)
 */
export async function getCachedLPs(
  supabase: SupabaseClient,
  organizationId: string
): Promise<LPContext[]> {
  const { data, error } = await supabase
    .from("lp_contacts")
    .select("id, name, email, firm")
    .eq("organization_id", organizationId)
    .limit(500);

  if (error) {
    console.error("Error fetching LPs for AI context:", error);
    return [];
  }

  return data || [];
}
