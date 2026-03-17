interface DealForScoring {
  target_raise: number | null;
  min_check_size: number | null;
  max_check_size: number | null;
  sector: string | null;
  investment_stage: string | null;
  geography: string | null;
}

interface LPForScoring {
  preferred_check_size: number | null;
  preferred_sectors: string[];
  preferred_stages: string[];
  preferred_geographies: string[];
  derived_sectors: string[];
  derived_stages: string[];
  derived_geographies: string[];
  last_deal_activity_at: string | null;
  last_interaction_at: string | null;
}

export interface ScoreResult {
  total: number;
  checkSize: number;
  sector: number;
  stage: number;
  geography: number;
  recency: number;
  breakdown: {
    checkSize: string;
    sector: string;
    stage: string;
    geography: string;
    recency: string;
  };
}

const STAGE_ORDER = [
  "pre_seed",
  "pre-seed",
  "seed",
  "series_a",
  "series a",
  "series_b",
  "series b",
  "series_c",
  "series c",
  "growth",
  "late_stage",
  "late stage",
];

function normalizeStage(stage: string): number {
  const lower = stage.toLowerCase().trim();
  const idx = STAGE_ORDER.findIndex(
    (s) => lower === s || lower.replace(/[_\s-]/g, "") === s.replace(/[_\s-]/g, "")
  );
  return idx >= 0 ? idx : -1;
}

// Adjacent sectors that are conceptually related
const ADJACENT_SECTORS: Record<string, string[]> = {
  fintech: ["saas", "enterprise", "crypto"],
  healthcare: ["biotech"],
  saas: ["enterprise", "fintech", "ai_ml"],
  ai_ml: ["saas", "enterprise"],
  consumer: ["enterprise"],
  enterprise: ["saas", "ai_ml", "fintech"],
  biotech: ["healthcare", "climate"],
  climate: ["biotech"],
  crypto: ["fintech"],
};

// Adjacent geographies
const ADJACENT_GEOS: Record<string, string[]> = {
  us: ["global"],
  europe: ["global"],
  asia: ["global"],
  global: ["us", "europe", "asia", "latam", "mena", "africa"],
  latam: ["global", "us"],
  mena: ["global", "europe"],
  africa: ["global"],
};

/**
 * Score an LP against a deal across all 5 dimensions.
 * Returns a total score (0–85) and per-dimension breakdown.
 */
export function scoreLpForDeal(deal: DealForScoring, lp: LPForScoring): ScoreResult {
  const checkSize = scoreCheckSize(deal, lp);
  const sector = scoreSector(deal, lp);
  const stage = scoreStage(deal, lp);
  const geography = scoreGeography(deal, lp);
  const recency = scoreRecency(lp);

  return {
    total: checkSize.score + sector.score + stage.score + geography.score + recency.score,
    checkSize: checkSize.score,
    sector: sector.score,
    stage: stage.score,
    geography: geography.score,
    recency: recency.score,
    breakdown: {
      checkSize: checkSize.reason,
      sector: sector.reason,
      stage: stage.reason,
      geography: geography.reason,
      recency: recency.reason,
    },
  };
}

function scoreCheckSize(
  deal: DealForScoring,
  lp: LPForScoring
): { score: number; reason: string } {
  const lpCheck = lp.preferred_check_size;
  if (!lpCheck) return { score: 6, reason: "No check size data — neutral score" };

  const dealMin = deal.min_check_size || 0;
  const dealMax = deal.max_check_size || deal.target_raise || 0;

  if (dealMin === 0 && dealMax === 0) {
    return { score: 10, reason: "No deal size constraints" };
  }

  // Check if LP's preferred check fits within deal range
  const inRange = lpCheck >= dealMin && lpCheck <= dealMax;
  const within1_5x = lpCheck >= dealMin / 1.5 && lpCheck <= dealMax * 1.5;
  const atEdge = lpCheck >= dealMin / 2 && lpCheck <= dealMax * 2;

  if (inRange) {
    // Check for sweet spot bonus (middle third of range)
    const rangeSize = dealMax - dealMin;
    const lowerThird = dealMin + rangeSize / 3;
    const upperThird = dealMax - rangeSize / 3;
    const inSweetSpot = rangeSize > 0 && lpCheck >= lowerThird && lpCheck <= upperThird;

    if (inSweetSpot) {
      return { score: 25, reason: "Check size in sweet spot of deal range (+5 bonus)" };
    }
    return { score: 20, reason: "Check size within deal range" };
  }

  if (within1_5x) {
    return { score: 10, reason: "Check size slightly outside range (within 1.5x)" };
  }

  if (atEdge) {
    return { score: 5, reason: "Check size at edge of deal range" };
  }

  return { score: 0, reason: "Check size outside deal range" };
}

function scoreSector(
  deal: DealForScoring,
  lp: LPForScoring
): { score: number; reason: string } {
  if (!deal.sector) return { score: 10, reason: "No deal sector specified" };

  const allLpSectors = [
    ...((lp.preferred_sectors || []) as string[]),
    ...((lp.derived_sectors || []) as string[]),
  ].map((s) => s.toLowerCase());

  if (allLpSectors.length === 0) {
    return { score: 6, reason: "Generalist — no sector preferences" };
  }

  const dealSector = deal.sector.toLowerCase();

  // Exact match
  if (allLpSectors.includes(dealSector)) {
    return { score: 20, reason: "Exact sector match: " + deal.sector };
  }

  // Adjacent sector with portfolio overlap
  const adjacents = ADJACENT_SECTORS[dealSector] || [];
  const hasAdjacent = allLpSectors.some((s) => adjacents.includes(s));
  if (hasAdjacent) {
    return { score: 12, reason: "Adjacent sector with portfolio overlap" };
  }

  return { score: 0, reason: "No sector alignment" };
}

function scoreStage(
  deal: DealForScoring,
  lp: LPForScoring
): { score: number; reason: string } {
  if (!deal.investment_stage) return { score: 10, reason: "No deal stage specified" };

  const allLpStages = [
    ...((lp.preferred_stages || []) as string[]),
    ...((lp.derived_stages || []) as string[]),
  ].map((s) => s.toLowerCase());

  if (allLpStages.length === 0) {
    return { score: 10, reason: "No stage preferences — neutral" };
  }

  const dealStageIdx = normalizeStage(deal.investment_stage);
  if (dealStageIdx < 0) return { score: 10, reason: "Unknown deal stage" };

  let bestDistance = Infinity;
  for (const lpStage of allLpStages) {
    const lpIdx = normalizeStage(lpStage);
    if (lpIdx >= 0) {
      bestDistance = Math.min(bestDistance, Math.abs(dealStageIdx - lpIdx));
    }
  }

  if (bestDistance === 0) return { score: 20, reason: "Exact stage match" };
  if (bestDistance === 1) return { score: 10, reason: "One stage off" };
  return { score: 0, reason: "Two or more stages off" };
}

function scoreGeography(
  deal: DealForScoring,
  lp: LPForScoring
): { score: number; reason: string } {
  if (!deal.geography) return { score: 5, reason: "No deal geography specified" };

  const allLpGeos = [
    ...((lp.preferred_geographies || []) as string[]),
    ...((lp.derived_geographies || []) as string[]),
  ].map((s) => s.toLowerCase());

  if (allLpGeos.length === 0) {
    return { score: 5, reason: "No geography preferences — neutral" };
  }

  const dealGeo = deal.geography.toLowerCase();

  if (allLpGeos.includes(dealGeo)) {
    return { score: 10, reason: "Exact geography match" };
  }

  const adjacents = ADJACENT_GEOS[dealGeo] || [];
  if (allLpGeos.some((g) => adjacents.includes(g))) {
    return { score: 5, reason: "Adjacent geography" };
  }

  return { score: 0, reason: "No geographic alignment" };
}

function scoreRecency(lp: LPForScoring): { score: number; reason: string } {
  const lastActivity = lp.last_deal_activity_at || lp.last_interaction_at;
  if (!lastActivity) return { score: 0, reason: "No activity history" };

  const monthsAgo =
    (Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24 * 30);

  if (monthsAgo <= 6) return { score: 10, reason: "Active in last 6 months" };
  if (monthsAgo <= 18) return { score: 5, reason: "Last activity 6-18 months ago" };
  return { score: 0, reason: "No activity in 18+ months" };
}
