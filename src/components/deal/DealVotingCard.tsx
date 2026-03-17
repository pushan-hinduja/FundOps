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

const VOTE_ICONS: Record<VoteValue, { icon: typeof ThumbsUp; label: string; color: string; activeColor: string }> = {
  up: { icon: ThumbsUp, label: "Yes", color: "text-muted-foreground", activeColor: "text-green-600 bg-green-50" },
  down: { icon: ThumbsDown, label: "No", color: "text-muted-foreground", activeColor: "text-red-600 bg-red-50" },
  sideways: { icon: Minus, label: "Maybe", color: "text-muted-foreground", activeColor: "text-yellow-600 bg-yellow-50" },
};

export function DealVotingCard({ dealId, readOnly = false }: DealVotingCardProps) {
  const [votes, setVotes] = useState<Vote[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [showComment, setShowComment] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadVotes();
  }, [dealId]);

  async function loadVotes() {
    const res = await fetch(`/api/deals/${dealId}/votes`);
    if (res.ok) {
      const data = await res.json();
      setVotes(data.votes || []);
      setCurrentUserId(data.currentUserId);
      // Load existing comment if user has voted
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
      if (res.ok) {
        await loadVotes();
        setShowComment(true);
      }
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
    <div className="bg-card rounded-2xl p-6 border border-border">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Team Votes</h3>
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

      {/* Current user's vote buttons */}
      {!readOnly && (
        <div className="mb-4 p-3 rounded-xl bg-secondary/30 border border-border">
          <p className="text-xs text-muted-foreground mb-2">Your vote</p>
          <div className="flex items-center gap-2">
            {(Object.entries(VOTE_ICONS) as [VoteValue, typeof VOTE_ICONS.up][]).map(
              ([value, { icon: Icon, label, activeColor }]) => (
                <button
                  key={value}
                  onClick={() => submitVote(value)}
                  disabled={submitting}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                    myVote?.vote === value
                      ? activeColor + " border-current"
                      : "text-muted-foreground border-border hover:bg-secondary"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              )
            )}
          </div>
          {(myVote || showComment) && (
            <div className="mt-2">
              <input
                type="text"
                value={commentDraft}
                onChange={(e) => setCommentDraft(e.target.value)}
                onBlur={updateComment}
                placeholder="Add a reason (optional)..."
                className="w-full px-3 py-1.5 text-xs border border-border rounded-lg bg-background"
              />
            </div>
          )}
        </div>
      )}

      {/* All votes */}
      <div className="space-y-2">
        {votes.map((v) => {
          const voteInfo = VOTE_ICONS[v.vote];
          const Icon = voteInfo.icon;
          const isMe = v.user_id === currentUserId;

          return (
            <div
              key={v.id}
              className={`flex items-start gap-3 p-2 rounded-lg ${isMe ? "bg-secondary/20" : ""}`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                v.vote === "up" ? "bg-green-50 text-green-600" :
                v.vote === "down" ? "bg-red-50 text-red-600" :
                "bg-yellow-50 text-yellow-600"
              }`}>
                <Icon className="w-3 h-3" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">
                  {v.users?.name || v.users?.email || "Unknown"}
                  {isMe && <span className="text-xs text-muted-foreground ml-1">(you)</span>}
                </p>
                {v.comment && (
                  <p className="text-xs text-muted-foreground mt-0.5">{v.comment}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
