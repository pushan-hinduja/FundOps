"use client";

import { useState, useEffect } from "react";
import { X, RefreshCw, Loader2, ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import Link from "next/link";

interface MatchScore {
  id: string;
  total_score: number;
  check_size_score: number;
  sector_score: number;
  stage_score: number;
  geography_score: number;
  recency_score: number;
  score_breakdown: Record<string, string> | null;
  is_excluded: boolean;
  lp_contacts: {
    id: string;
    name: string;
    email: string;
    firm: string | null;
    preferred_check_size: number | null;
    investor_type: string | null;
  } | null;
}

interface LPRelationshipSummary {
  id: string;
  status: string;
  committed_amount: number | null;
  lp_contacts: {
    id: string;
    name: string;
    firm: string | null;
    email: string;
  } | null;
}

interface LPMatchModalProps {
  dealId: string;
  dealName: string;
  isOpen: boolean;
  onClose: () => void;
  lpRelationships?: LPRelationshipSummary[];
  showRecommended?: boolean;
}

const DIMENSION_INFO: { key: string; label: string; max: number; breakdownKey: string }[] = [
  { key: "check_size_score", label: "Check Size", max: 30, breakdownKey: "checkSize" },
  { key: "sector_score", label: "Sector", max: 25, breakdownKey: "sector" },
  { key: "stage_score", label: "Stage", max: 25, breakdownKey: "stage" },
  { key: "geography_score", label: "Geo", max: 10, breakdownKey: "geography" },
  { key: "recency_score", label: "Recent", max: 10, breakdownKey: "recency" },
];

function ScoreBadge({ score, max }: { score: number; max: number }) {
  return (
    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border border-border text-foreground">
      {score}/{max}
    </span>
  );
}

function TotalScoreBadge({ score }: { score: number }) {
  const color =
    score >= 70 ? "bg-green-100 text-green-700 border-green-200" :
    score >= 45 ? "bg-yellow-100 text-yellow-700 border-yellow-200" :
    "bg-gray-100 text-gray-500 border-gray-200";

  return (
    <span className={`text-sm font-bold w-10 h-10 rounded-full border flex items-center justify-center flex-shrink-0 ${color}`}>
      {score}
    </span>
  );
}

function ScoreRow({ score }: { score: MatchScore }) {
  const [expanded, setExpanded] = useState(false);
  const breakdown = score.score_breakdown as Record<string, string> | null;

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      {/* Main row */}
      <div
        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-secondary/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Total score */}
        <TotalScoreBadge score={score.total_score} />

        {/* LP info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {score.lp_contacts?.name || "Unknown LP"}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {score.lp_contacts?.firm || ""}
            {score.lp_contacts?.preferred_check_size
              ? " · $" + (score.lp_contacts.preferred_check_size / 1000).toFixed(0) + "K avg. check"
              : ""}
          </p>
        </div>

        {/* Dimension scores */}
        <div className="flex items-center gap-1.5">
          {DIMENSION_INFO.map((dim) => (
            <div key={dim.key} className="flex flex-col items-center gap-0.5">
              <ScoreBadge
                score={score[dim.key as keyof MatchScore] as number}
                max={dim.max}
              />
              <span className="text-[8px] text-muted-foreground">{dim.label}</span>
            </div>
          ))}
        </div>

        {/* LP link */}
        {score.lp_contacts?.id && (
          <Link
            href={"/lps/" + score.lp_contacts.id}
            onClick={(e) => e.stopPropagation()}
            className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-lg hover:bg-secondary transition-colors"
            title="View LP profile"
          >
            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
          </Link>
        )}

        {/* Expand chevron */}
        <div className="text-muted-foreground flex-shrink-0">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && breakdown && (
        <div className="px-4 pb-3 pt-1 border-t border-border bg-secondary/10">
          <div className="space-y-2.5 pt-2">
            {DIMENSION_INFO.map((dim) => {
              const dimScore = score[dim.key as keyof MatchScore] as number;
              const reason = breakdown[dim.breakdownKey] || "No data";
              const pct = dim.max > 0 ? (dimScore / dim.max) * 100 : 0;
              const barColor =
                pct >= 80 ? "bg-green-400" :
                pct >= 50 ? "bg-yellow-400" :
                "bg-gray-300";

              return (
                <div key={dim.key}>
                  <div className="flex items-center gap-3 mb-0.5">
                    <span className="text-xs font-medium text-foreground w-20 flex-shrink-0">{dim.label}</span>
                    <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={"h-full rounded-full " + barColor}
                        style={{ width: pct + "%" }}
                      />
                    </div>
                    <span className="text-[10px] tabular-nums text-muted-foreground w-10 text-right">
                      {dimScore}/{dim.max}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground ml-[calc(5rem+0.75rem)]">{reason}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

type ModalTab = "investors" | "recommended";

export function LPMatchModal({ dealId, dealName, isOpen, onClose, lpRelationships, showRecommended = true }: LPMatchModalProps) {
  const [scores, setScores] = useState<MatchScore[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const hasInvestors = lpRelationships && lpRelationships.length > 0;
  const [activeTab, setActiveTab] = useState<ModalTab>(hasInvestors ? "investors" : "recommended");

  useEffect(() => {
    if (isOpen && !hasLoaded && activeTab === "recommended") {
      loadScores();
    }
  }, [isOpen, activeTab]);

  async function loadScores() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/deals/" + dealId + "/matches");
      const data = await res.json();
      if (data.scores && data.scores.length > 0) {
        setScores(data.scores);
        setHasLoaded(true);
      } else {
        await refreshScores();
      }
    } catch {
      // fail silently
    } finally {
      setIsLoading(false);
    }
  }

  async function refreshScores() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/deals/" + dealId + "/matches", { method: "POST" });
      const data = await res.json();
      setScores(data.scores || []);
      setHasLoaded(true);
    } catch {
      // fail silently
    } finally {
      setIsLoading(false);
    }
  }

  if (!isOpen) return null;

  const activeScores = scores.filter((s) => !s.is_excluded);
  const excludedScores = scores.filter((s) => s.is_excluded);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative glass-card text-foreground rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 pb-0 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">LP Overview</h2>
              <p className="text-sm text-muted-foreground">{dealName}</p>
            </div>
            <div className="flex items-center gap-2">
              {activeTab === "recommended" && (
                <button
                  onClick={refreshScores}
                  disabled={isLoading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-foreground bg-secondary hover:bg-secondary/80 rounded-lg transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={"w-3 h-3 " + (isLoading ? "animate-spin" : "")} />
                  Refresh
                </button>
              )}
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-foreground" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab("investors")}
              className={"pb-2.5 text-sm font-medium border-b-2 transition-colors " +
                (activeTab === "investors"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground")}
            >
              Investors{lpRelationships ? " (" + lpRelationships.length + ")" : ""}
            </button>
            {showRecommended && (
              <button
                onClick={() => setActiveTab("recommended")}
                className={"pb-2.5 text-sm font-medium border-b-2 transition-colors " +
                  (activeTab === "recommended"
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground")}
              >
                Recommended LPs
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 pt-4">
          {/* Investors Tab */}
          {activeTab === "investors" && (
            <div className="space-y-2">
              {!lpRelationships || lpRelationships.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <p className="text-sm text-muted-foreground">No investors on this deal yet.</p>
                </div>
              ) : (
                lpRelationships.map((rel) => (
                  <div
                    key={rel.id}
                    className="flex items-center gap-3 p-3 rounded-xl border border-border"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {rel.lp_contacts?.name || "Unknown LP"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {rel.lp_contacts?.firm || ""}
                        {rel.committed_amount
                          ? " · $" + (rel.committed_amount >= 1000000
                              ? (rel.committed_amount / 1000000).toFixed(1) + "M"
                              : (rel.committed_amount / 1000).toFixed(0) + "K")
                          : ""}
                      </p>
                    </div>
                    <span className={"text-xs font-medium px-2 py-1 rounded-lg " +
                      (rel.status === "committed" || rel.status === "allocated"
                        ? "bg-green-100 text-green-700"
                        : rel.status === "interested"
                        ? "bg-blue-100 text-blue-700"
                        : rel.status === "contacted"
                        ? "bg-gray-100 text-gray-600"
                        : "bg-red-100 text-red-600")
                    }>
                      {rel.status.charAt(0).toUpperCase() + rel.status.slice(1)}
                    </span>
                    {rel.lp_contacts?.id && (
                      <Link
                        href={"/lps/" + rel.lp_contacts.id}
                        className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-lg hover:bg-secondary transition-colors"
                        title="View LP profile"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                      </Link>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Recommended LPs Tab */}
          {activeTab === "recommended" && (
          isLoading && scores.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Computing match scores...</p>
            </div>
          ) : activeScores.length === 0 && !isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-sm text-muted-foreground">No LP matches found. Try adding more deal details (sector, stage, geography).</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Score legend */}
              <div className="flex items-center gap-4 text-[10px] text-muted-foreground mb-4 px-1">
                <span>Score out of 100:</span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-400" /> 70+ Strong
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-yellow-400" /> 45-69 Moderate
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-gray-300" /> &lt;45 Weak
                </span>
              </div>

              {activeScores.map((score) => (
                <ScoreRow key={score.id} score={score} />
              ))}

              {/* Excluded section */}
              {excludedScores.length > 0 && (
                <>
                  <div className="border-t border-border mt-4 pt-3">
                    <p className="text-xs text-muted-foreground mb-2 px-1">
                      Already on this deal ({excludedScores.length})
                    </p>
                  </div>
                  {excludedScores.map((score) => (
                    <div
                      key={score.id}
                      className="flex items-center gap-3 p-3 rounded-xl border border-border opacity-50"
                    >
                      <TotalScoreBadge score={score.total_score} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {score.lp_contacts?.name || "Unknown LP"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {score.lp_contacts?.firm || ""}
                        </p>
                      </div>
                      {score.lp_contacts?.id && (
                        <Link
                          href={"/lps/" + score.lp_contacts.id}
                          className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-lg hover:bg-secondary transition-colors"
                          title="View LP profile"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                        </Link>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
