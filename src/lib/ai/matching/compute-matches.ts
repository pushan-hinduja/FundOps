import { SupabaseClient } from "@supabase/supabase-js";
import { scoreLpForDeal } from "./scorer";
import { deriveLpPreferences } from "./derive-lp-preferences";

interface ComputeMatchesParams {
  supabase: SupabaseClient;
  dealId: string;
  organizationId: string;
}

export async function computeMatches(params: ComputeMatchesParams) {
  const { supabase, dealId, organizationId } = params;

  // 1. Derive LP preferences from deal history
  await deriveLpPreferences(supabase, organizationId);

  // 2. Fetch the deal
  const { data: deal, error: dealError } = await supabase
    .from("deals")
    .select(
      "id, target_raise, min_check_size, max_check_size, sector, investment_stage, geography"
    )
    .eq("id", dealId)
    .single();

  if (dealError || !deal) {
    throw new Error("Deal not found: " + (dealError?.message || dealId));
  }

  // 3. Fetch all LPs for this org
  const { data: lps, error: lpsError } = await supabase
    .from("lp_contacts")
    .select(
      "id, preferred_check_size, preferred_sectors, preferred_stages, preferred_geographies, derived_sectors, derived_stages, derived_geographies, last_deal_activity_at, last_interaction_at"
    )
    .eq("organization_id", organizationId);

  if (lpsError || !lps) {
    throw new Error("Failed to fetch LPs: " + (lpsError?.message || ""));
  }

  // 4. Get LPs already on this deal (to mark as excluded)
  const { data: existingRels } = await supabase
    .from("deal_lp_relationships")
    .select("lp_contact_id")
    .eq("deal_id", dealId);

  const excludedLpIds = new Set(
    (existingRels || []).map((r) => r.lp_contact_id as string)
  );

  // 5. Score each LP
  const scores = lps.map((lp) => {
    const result = scoreLpForDeal(
      {
        target_raise: deal.target_raise,
        min_check_size: deal.min_check_size,
        max_check_size: deal.max_check_size,
        sector: deal.sector,
        investment_stage: deal.investment_stage,
        geography: deal.geography,
      },
      {
        preferred_check_size: lp.preferred_check_size,
        preferred_sectors: (lp.preferred_sectors || []) as string[],
        preferred_stages: (lp.preferred_stages || []) as string[],
        preferred_geographies: (lp.preferred_geographies || []) as string[],
        derived_sectors: (lp.derived_sectors || []) as string[],
        derived_stages: (lp.derived_stages || []) as string[],
        derived_geographies: (lp.derived_geographies || []) as string[],
        last_deal_activity_at: lp.last_deal_activity_at,
        last_interaction_at: lp.last_interaction_at,
      }
    );

    return {
      deal_id: dealId,
      lp_contact_id: lp.id,
      total_score: result.total,
      check_size_score: result.checkSize,
      sector_score: result.sector,
      stage_score: result.stage,
      geography_score: result.geography,
      recency_score: result.recency,
      score_breakdown: result.breakdown,
      is_excluded: excludedLpIds.has(lp.id),
      computed_at: new Date().toISOString(),
    };
  });

  // 6. Delete old scores for this deal and insert new ones
  await supabase.from("lp_match_scores").delete().eq("deal_id", dealId);

  if (scores.length > 0) {
    const { error: insertError } = await supabase
      .from("lp_match_scores")
      .insert(scores);

    if (insertError) {
      throw new Error("Failed to save scores: " + insertError.message);
    }
  }

  // 7. Return scores sorted by total_score DESC, excluded at the bottom
  return scores
    .sort((a, b) => {
      if (a.is_excluded !== b.is_excluded) return a.is_excluded ? 1 : -1;
      return b.total_score - a.total_score;
    });
}
