"use client";

import { useState, useEffect } from "react";
import { X, RefreshCw, Loader2 } from "lucide-react";

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

interface LPMatchModalProps {
  dealId: string;
  dealName: string;
  isOpen: boolean;
  onClose: () => void;
}

function ScoreBadge({ score, max, label }: { score: number; max: number; label: string }) {
  const pct = max > 0 ? (score / max) * 100 : 0;
  const color =
    pct >= 80 ? "bg-green-500/20 text-green-400" :
    pct >= 50 ? "bg-yellow-500/20 text-yellow-400" :
    "bg-white/10 text-white/50";

  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${color}`}>
        {score}/{max}
      </span>
      <span className="text-[9px] text-muted-foreground">{label}</span>
    </div>
  );
}

function TotalScoreBadge({ score }: { score: number }) {
  const color =
    score >= 60 ? "bg-green-500/20 text-green-400 border-green-500/30" :
    score >= 40 ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" :
    "bg-white/10 text-white/60 border-white/10";

  return (
    <span className={`text-sm font-bold px-2.5 py-1 rounded-lg border ${color}`}>
      {score}
    </span>
  );
}

export function LPMatchModal({ dealId, dealName, isOpen, onClose }: LPMatchModalProps) {
  const [scores, setScores] = useState<MatchScore[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    if (isOpen && !hasLoaded) {
      loadScores();
    }
  }, [isOpen]);

  async function loadScores() {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/deals/${dealId}/matches`);
      const data = await res.json();
      if (data.scores && data.scores.length > 0) {
        setScores(data.scores);
        setHasLoaded(true);
      } else {
        // No cached scores — compute them
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
      const res = await fetch(`/api/deals/${dealId}/matches`, { method: "POST" });
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
        <div className="flex items-center justify-between p-6 pb-4 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold">Recommended Investors</h2>
            <p className="text-sm text-muted-foreground">{dealName}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={refreshScores}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-secondary hover:bg-secondary/80 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 pt-4">
          {isLoading && scores.length === 0 ? (
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
                <span>Score out of 85:</span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500/40" /> 60+ Strong
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-yellow-500/40" /> 40-59 Moderate
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-white/20" /> &lt;40 Weak
                </span>
              </div>

              {activeScores.map((score) => (
                <div
                  key={score.id}
                  className="flex items-center gap-4 p-3 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors"
                >
                  {/* Total score */}
                  <TotalScoreBadge score={score.total_score} />

                  {/* LP info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {score.lp_contacts?.name || "Unknown LP"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {score.lp_contacts?.firm || ""}
                      {score.lp_contacts?.preferred_check_size
                        ? ` · $${(score.lp_contacts.preferred_check_size / 1000).toFixed(0)}K check`
                        : ""}
                    </p>
                  </div>

                  {/* Dimension scores */}
                  <div className="flex items-center gap-2">
                    <ScoreBadge score={score.check_size_score} max={25} label="Size" />
                    <ScoreBadge score={score.sector_score} max={20} label="Sector" />
                    <ScoreBadge score={score.stage_score} max={20} label="Stage" />
                    <ScoreBadge score={score.geography_score} max={10} label="Geo" />
                    <ScoreBadge score={score.recency_score} max={10} label="Recent" />
                  </div>
                </div>
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
                      className="flex items-center gap-4 p-3 rounded-xl bg-secondary/10 opacity-50"
                    >
                      <TotalScoreBadge score={score.total_score} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {score.lp_contacts?.name || "Unknown LP"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {score.lp_contacts?.firm || ""}
                        </p>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
