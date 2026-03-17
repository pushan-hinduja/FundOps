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

function fmtUsd(n: number): string {
  if (n >= 1_000_000) return "$" + (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return "$" + (n / 1_000).toFixed(0) + "K";
  return "$" + n;
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
  if (!lpCheck) return { score: 8, reason: "No historical check size data" };

  const dealMin = deal.min_check_size || 0;
  const dealMax = deal.max_check_size || deal.target_raise || 0;
  const fmtLp = fmtUsd(lpCheck);
  const fmtRange = dealMin && dealMax ? fmtUsd(dealMin) + "–" + fmtUsd(dealMax) : fmtUsd(dealMax);

  if (dealMin === 0 && dealMax === 0) {
    return { score: 12, reason: "LP avg check " + fmtLp + "; deal has no size constraints" };
  }

  const inRange = lpCheck >= dealMin && lpCheck <= dealMax;
  const within1_5x = lpCheck >= dealMin / 1.5 && lpCheck <= dealMax * 1.5;
  const atEdge = lpCheck >= dealMin / 2 && lpCheck <= dealMax * 2;

  if (inRange) {
    const rangeSize = dealMax - dealMin;
    const lowerThird = dealMin + rangeSize / 3;
    const upperThird = dealMax - rangeSize / 3;
    const inSweetSpot = rangeSize > 0 && lpCheck >= lowerThird && lpCheck <= upperThird;

    if (inSweetSpot) {
      return { score: 30, reason: "LP avg check " + fmtLp + " is in the sweet spot of deal range " + fmtRange };
    }
    return { score: 24, reason: "LP avg check " + fmtLp + " fits within deal range " + fmtRange };
  }

  if (within1_5x) {
    return { score: 12, reason: "LP avg check " + fmtLp + " slightly outside deal range " + fmtRange + " (within 1.5x)" };
  }

  if (atEdge) {
    return { score: 6, reason: "LP avg check " + fmtLp + " at edge of deal range " + fmtRange };
  }

  return { score: 0, reason: "LP avg check " + fmtLp + " outside deal range " + fmtRange };
}

function scoreSector(
  deal: DealForScoring,
  lp: LPForScoring
): { score: number; reason: string } {
  if (!deal.sector) return { score: 12, reason: "No sector set on deal" };

  const prefSectors = ((lp.preferred_sectors || []) as string[]).map((s) => s.toLowerCase());
  const derivedSectors = ((lp.derived_sectors || []) as string[]).map((s) => s.toLowerCase());
  const allLpSectors = [...prefSectors, ...derivedSectors];

  if (allLpSectors.length === 0) {
    return { score: 8, reason: "Generalist investor — no sector history or preferences on file" };
  }

  const dealSector = deal.sector.toLowerCase();
  const sectorList = [...new Set(allLpSectors)].join(", ");

  if (allLpSectors.includes(dealSector)) {
    const source = prefSectors.includes(dealSector) ? "preferred sectors" : "past deal history";
    return { score: 25, reason: "Direct " + deal.sector + " investor (from " + source + "). Active in: " + sectorList };
  }

  const adjacents = ADJACENT_SECTORS[dealSector] || [];
  const matchedAdj = allLpSectors.filter((s) => adjacents.includes(s));
  if (matchedAdj.length > 0) {
    return { score: 15, reason: "Adjacent sector overlap via " + matchedAdj.join(", ") + ". LP sectors: " + sectorList };
  }

  return { score: 0, reason: "LP invests in " + sectorList + " — no overlap with " + deal.sector };
}

function scoreStage(
  deal: DealForScoring,
  lp: LPForScoring
): { score: number; reason: string } {
  if (!deal.investment_stage) return { score: 12, reason: "No stage set on deal" };

  const allLpStages = [
    ...((lp.preferred_stages || []) as string[]),
    ...((lp.derived_stages || []) as string[]),
  ].map((s) => s.toLowerCase());

  if (allLpStages.length === 0) {
    return { score: 12, reason: "No stage history or preferences on file" };
  }

  const dealStageIdx = normalizeStage(deal.investment_stage);
  const stageList = [...new Set(allLpStages)].join(", ");
  if (dealStageIdx < 0) return { score: 12, reason: "Unknown deal stage; LP stages: " + stageList };

  let bestDistance = Infinity;
  for (const lpStage of allLpStages) {
    const lpIdx = normalizeStage(lpStage);
    if (lpIdx >= 0) {
      bestDistance = Math.min(bestDistance, Math.abs(dealStageIdx - lpIdx));
    }
  }

  if (bestDistance === 0) return { score: 25, reason: "Invests at " + deal.investment_stage + " stage (exact match). History: " + stageList };
  if (bestDistance === 1) return { score: 12, reason: "Invests at " + stageList + " — one stage off from " + deal.investment_stage };
  return { score: 0, reason: "Invests at " + stageList + " — two+ stages off from " + deal.investment_stage };
}

function scoreGeography(
  deal: DealForScoring,
  lp: LPForScoring
): { score: number; reason: string } {
  if (!deal.geography) return { score: 5, reason: "No geography set on deal" };

  const allLpGeos = [
    ...((lp.preferred_geographies || []) as string[]),
    ...((lp.derived_geographies || []) as string[]),
  ].map((s) => s.toLowerCase());

  if (allLpGeos.length === 0) {
    return { score: 5, reason: "No geography history or preferences on file" };
  }

  const dealGeo = deal.geography.toLowerCase();
  const geoList = [...new Set(allLpGeos)].join(", ");

  if (allLpGeos.includes(dealGeo)) {
    return { score: 10, reason: "Invests in " + deal.geography + " (exact match). Regions: " + geoList };
  }

  const adjacents = ADJACENT_GEOS[dealGeo] || [];
  if (allLpGeos.some((g) => adjacents.includes(g))) {
    return { score: 5, reason: "Invests in " + geoList + " — adjacent to " + deal.geography };
  }

  return { score: 0, reason: "Invests in " + geoList + " — no overlap with " + deal.geography };
}

function scoreRecency(lp: LPForScoring): { score: number; reason: string } {
  const lastActivity = lp.last_deal_activity_at || lp.last_interaction_at;
  if (!lastActivity) return { score: 0, reason: "No deal activity or interaction on record" };

  const date = new Date(lastActivity);
  const monthsAgo =
    (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24 * 30);
  const dateStr = date.toLocaleDateString("en-US", { month: "short", year: "numeric" });

  if (monthsAgo <= 6) return { score: 10, reason: "Last active " + dateStr + " (" + Math.round(monthsAgo) + " months ago)" };
  if (monthsAgo <= 18) return { score: 5, reason: "Last active " + dateStr + " (" + Math.round(monthsAgo) + " months ago — slowing down)" };
  return { score: 0, reason: "Last active " + dateStr + " (" + Math.round(monthsAgo) + " months ago — may be between funds)" };
}
