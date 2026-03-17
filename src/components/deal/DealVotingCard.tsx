"use client";

import { useState, useEffect } from "react";
import { ThumbsUp, ThumbsDown, Minus } from "lucide-react";

type VoteValue = "up" | "down" | "sideways";

interface Vote {
  id: string;
  user_id: string;
  vote: VoteValue;
  comment: string | null;
  users: { id: string; name: string | null; email: string } | null;
}

interface DealVotingCardProps {
  dealId: string;
  readOnly?: boolean;
}

const VOTE_CONFIG: Record<VoteValue, {
  icon: typeof ThumbsUp;
  label: string;
  activeRing: string;
  activeBg: string;
  activeText: string;
  iconActive: string;
}> = {
  up: {
    icon: ThumbsUp,
    label: "Yes",
    activeRing: "ring-2 ring-green-400",
    activeBg: "bg-green-50",
    activeText: "text-green-600",
    iconActive: "text-green-600",
  },
  down: {
    icon: ThumbsDown,
    label: "No",
    activeRing: "ring-2 ring-red-400",
    activeBg: "bg-red-50",
    activeText: "text-red-600",
    iconActive: "text-red-600",
  },
  sideways: {
    icon: Minus,
    label: "Maybe",
    activeRing: "ring-2 ring-yellow-400",
    activeBg: "bg-yellow-50",
    activeText: "text-yellow-600",
    iconActive: "text-yellow-600",
  },
};

export function DealVotingCard({ dealId, readOnly = false }: DealVotingCardProps) {
  const [votes, setVotes] = useState<Vote[]>([]);
  const [missingMembers, setMissingMembers] = useState<{ id: string; name: string | null; email: string }[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadVotes();
  }, [dealId]);

  async function loadVotes() {
    const res = await fetch(`/api/deals/${dealId}/votes`);
    if (res.ok) {
      const data = await res.json();
      setVotes(data.votes || []);
      setMissingMembers(data.missingMembers || []);
      setCurrentUserId(data.currentUserId);
      const myVote = (data.votes || []).find((v: Vote) => v.user_id === data.currentUserId);
      if (myVote?.comment) setCommentDraft(myVote.comment);
    }
  }

  async function submitVote(vote: VoteValue) {
    if (readOnly || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/deals/${dealId}/votes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vote, comment: commentDraft || null }),
      });
      if (res.ok) await loadVotes();
    } finally {
      setSubmitting(false);
    }
  }

  async function updateComment() {
    if (readOnly) return;
    const myVote = votes.find((v) => v.user_id === currentUserId);
    if (!myVote) return;
    await fetch(`/api/deals/${dealId}/votes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vote: myVote.vote, comment: commentDraft || null }),
    });
    await loadVotes();
  }

  const myVote = votes.find((v) => v.user_id === currentUserId);
  const upCount = votes.filter((v) => v.vote === "up").length;
  const downCount = votes.filter((v) => v.vote === "down").length;
  const sidewaysCount = votes.filter((v) => v.vote === "sideways").length;

  return (
    <div className="glass-card rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-medium">Team Votes</h2>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {upCount > 0 && (
            <span className="flex items-center gap-1">
              <ThumbsUp className="w-3 h-3 text-green-600" /> {upCount}
            </span>
          )}
          {downCount > 0 && (
            <span className="flex items-center gap-1">
              <ThumbsDown className="w-3 h-3 text-red-600" /> {downCount}
            </span>
          )}
          {sidewaysCount > 0 && (
            <span className="flex items-center gap-1">
              <Minus className="w-3 h-3 text-yellow-600" /> {sidewaysCount}
            </span>
          )}
          {votes.length === 0 && <span>No votes yet</span>}
        </div>
      </div>

      {/* Current user vote selector */}
      {!readOnly && (
        <div className="mb-6">
          <p className="text-xs text-muted-foreground mb-3">Your vote</p>
          <div className="flex items-center justify-center gap-6 mb-4">
            {(Object.entries(VOTE_CONFIG) as [VoteValue, typeof VOTE_CONFIG.up][]).map(
              ([value, config]) => {
                const Icon = config.icon;
                const isSelected = myVote?.vote === value;
                return (
                  <button
                    key={value}
                    onClick={() => submitVote(value)}
                    disabled={submitting}
                    className={`flex flex-col items-center gap-1.5 transition-all ${submitting ? "opacity-50" : ""}`}
                  >
                    <div
                      className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                        isSelected
                          ? `${config.activeBg} ${config.activeRing} scale-110`
                          : "bg-secondary/50 hover:bg-secondary hover:scale-105"
                      }`}
                    >
                      <Icon className={`w-6 h-6 ${isSelected ? config.iconActive : "text-muted-foreground"}`} />
                    </div>
                    <span className={`text-xs font-medium ${isSelected ? config.activeText : "text-muted-foreground"}`}>
                      {config.label}
                    </span>
                  </button>
                );
              }
            )}
          </div>

          {/* Comment bubble */}
          {myVote && (
            <div className="relative">
              {/* Triangle pointer */}
              <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-secondary/40 rotate-45 rounded-sm" />
              <div className="bg-secondary/40 rounded-2xl px-4 py-2.5 relative">
                <input
                  type="text"
                  value={commentDraft}
                  onChange={(e) => setCommentDraft(e.target.value)}
                  onBlur={updateComment}
                  onKeyDown={(e) => { if (e.key === "Enter") updateComment(); }}
                  placeholder="Add a comment..."
                  className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Divider */}
      {votes.length > 0 && !readOnly && (
        <div className="border-t border-border mb-4" />
      )}

      {/* All votes list */}
      <div className="space-y-3">
        {votes.map((v) => {
          const config = VOTE_CONFIG[v.vote];
          const Icon = config.icon;
          const isMe = v.user_id === currentUserId;

          return (
            <div key={v.id} className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${config.activeBg}`}>
                <Icon className={`w-3.5 h-3.5 ${config.iconActive}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">
                  {v.users?.name || v.users?.email || "Unknown"}
                  {isMe && <span className="text-xs text-muted-foreground ml-1">(you)</span>}
                </p>
                {v.comment && (
                  <div className="mt-1 relative inline-block">
                    <div className="bg-secondary/40 rounded-xl px-3 py-1.5">
                      <p className="text-xs text-muted-foreground">{v.comment}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Missing votes */}
      {missingMembers.length > 0 && (
        <>
          <div className="border-t border-border mt-4 pt-3">
            <p className="text-xs text-muted-foreground mb-2">Waiting on ({missingMembers.length})</p>
          </div>
          <div className="space-y-2">
            {missingMembers.map((m) => {
              const initial = (m.name || m.email || "?")[0].toUpperCase();
              return (
                <div key={m.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-secondary/50 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-medium text-muted-foreground">{initial}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {m.name || m.email}
                    {m.id === currentUserId && <span className="text-xs ml-1">(you)</span>}
                  </p>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
