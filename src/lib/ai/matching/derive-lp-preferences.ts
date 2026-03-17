import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Derive LP preferences from their deal history and update the LP record.
 * Runs for all LPs in an organization.
 */
export async function deriveLpPreferences(
  supabase: SupabaseClient,
  organizationId: string
): Promise<void> {
  // Get all LPs for this org
  const { data: lps } = await supabase
    .from("lp_contacts")
    .select("id")
    .eq("organization_id", organizationId);

  if (!lps || lps.length === 0) return;

  // Get all committed/allocated relationships with deal details
  const { data: relationships } = await supabase
    .from("deal_lp_relationships")
    .select(
      "lp_contact_id, status, updated_at, deals!inner(sector, investment_stage, geography, organization_id)"
    )
    .eq("deals.organization_id", organizationId)
    .in("status", ["committed", "allocated"]);

  if (!relationships) return;

  // Group by LP
  const lpData: Record<
    string,
    { sectors: Set<string>; stages: Set<string>; geos: Set<string>; lastActivity: string | null }
  > = {};

  for (const rel of relationships) {
    const lpId = rel.lp_contact_id as string;
    if (!lpData[lpId]) {
      lpData[lpId] = { sectors: new Set(), stages: new Set(), geos: new Set(), lastActivity: null };
    }

    const deal = rel.deals as unknown as {
      sector: string | null;
      investment_stage: string | null;
      geography: string | null;
    };

    if (deal.sector) lpData[lpId].sectors.add(deal.sector);
    if (deal.investment_stage) lpData[lpId].stages.add(deal.investment_stage);
    if (deal.geography) lpData[lpId].geos.add(deal.geography);

    // Track most recent activity
    const updatedAt = rel.updated_at as string;
    if (!lpData[lpId].lastActivity || updatedAt > lpData[lpId].lastActivity!) {
      lpData[lpId].lastActivity = updatedAt;
    }
  }

  // Update each LP with derived preferences
  for (const [lpId, data] of Object.entries(lpData)) {
    await supabase
      .from("lp_contacts")
      .update({
        derived_sectors: Array.from(data.sectors),
        derived_stages: Array.from(data.stages),
        derived_geographies: Array.from(data.geos),
        last_deal_activity_at: data.lastActivity,
      })
      .eq("id", lpId);
  }
}
