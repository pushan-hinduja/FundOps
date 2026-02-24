"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Send, RefreshCw, Loader2, AlertCircle } from "lucide-react";

interface InvestorUpdateRequestModalProps {
  dealId: string;
  dealName: string;
  companyName: string | null;
  founderEmail: string;
  onClose: () => void;
  onSent?: () => void;
}

export function InvestorUpdateRequestModal({
  dealId,
  dealName,
  companyName,
  founderEmail,
  onClose,
  onSent,
}: InvestorUpdateRequestModalProps) {
  const [draft, setDraft] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);

  const generateDraft = useCallback(async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/generate-investor-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealId, type: "request" }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate draft");
      }

      const data = await res.json();
      setDraft(data.draft);
      setHasGenerated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate draft");
    } finally {
      setIsGenerating(false);
    }
  }, [dealId]);

  useEffect(() => {
    if (!hasGenerated) {
      generateDraft();
    }
  }, [generateDraft, hasGenerated]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSending) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose, isSending]);

  const handleSend = async () => {
    if (!draft.trim()) {
      setSendError("Please enter a message");
      return;
    }

    setIsSending(true);
    setSendError(null);

    try {
      const res = await fetch(`/api/deals/${dealId}/investor-updates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: draft }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send request");
      }

      onSent?.();
      onClose();
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Failed to send request");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-2xl min-h-[60vh] max-h-[90vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-lg font-medium text-foreground">
              Request Investor Update
            </h2>
            <p className="text-sm text-muted-foreground">
              {companyName || dealName} &middot; To: {founderEmail}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSending}
            className="p-2 hover:bg-secondary rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col">
          {/* Error state */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex items-start gap-3 mb-4">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-destructive font-medium">
                  Failed to generate draft
                </p>
                <p className="text-sm text-destructive/80 mt-1">{error}</p>
                <button
                  type="button"
                  onClick={generateDraft}
                  className="text-sm text-destructive underline mt-2 hover:no-underline"
                >
                  Try again
                </button>
              </div>
            </div>
          )}

          {/* Textarea */}
          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-foreground">Email to Founder</label>
              <button
                type="button"
                onClick={generateDraft}
                disabled={isGenerating}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? "animate-spin" : ""}`} />
                Regenerate
              </button>
            </div>

            {isGenerating && !draft ? (
              <div className="border border-border rounded-xl p-8 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Generating draft...
                </p>
              </div>
            ) : (
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Type your request here..."
                className="w-full min-h-[12rem] flex-1 px-4 py-3 bg-background border border-border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-sm text-foreground"
                disabled={isSending}
              />
            )}
          </div>

          {/* Send error */}
          {sendError && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex items-start gap-3 mt-3">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{sendError}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border shrink-0">
          <p className="text-xs text-muted-foreground">
            Sending to: {founderEmail}
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSending}
              className="px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={isSending || !draft.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send Request
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
