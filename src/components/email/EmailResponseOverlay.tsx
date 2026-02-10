"use client";

import { useState, useEffect, useCallback } from "react";
import { X, RefreshCw, Send, Loader2, AlertCircle } from "lucide-react";

interface EmailData {
  id: string;
  from_email: string;
  from_name: string | null;
  subject: string | null;
  body_text: string | null;
  thread_id: string | null;
  message_id: string | null;
}

interface EmailResponseOverlayProps {
  email: EmailData;
  question: string;
  dealId: string;
  dealName: string;
  onClose: () => void;
  onSent?: () => void;
}

export function EmailResponseOverlay({
  email,
  question,
  dealId,
  dealName,
  onClose,
  onSent,
}: EmailResponseOverlayProps) {
  const [response, setResponse] = useState("");
  const [aiGeneratedResponse, setAiGeneratedResponse] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);

  const generateResponse = useCallback(async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/generate-response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailId: email.id,
          question,
          dealId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate response");
      }

      const data = await res.json();
      setResponse(data.response);
      setAiGeneratedResponse(data.response);
      setHasGenerated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate response");
    } finally {
      setIsGenerating(false);
    }
  }, [email.id, question, dealId]);

  // Auto-generate on mount
  useEffect(() => {
    if (!hasGenerated) {
      generateResponse();
    }
  }, [generateResponse, hasGenerated]);

  const handleSend = async () => {
    if (!response.trim()) {
      setSendError("Please enter a response");
      return;
    }

    setIsSending(true);
    setSendError(null);

    try {
      const res = await fetch("/api/emails/send-response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailId: email.id,
          responseText: response,
          question,
          dealId,
          aiGeneratedResponse,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        if (data.code === "PERMISSION_DENIED") {
          throw new Error("Gmail send permission not granted. Please go to Settings > Email and reconnect your Gmail account.");
        }
        throw new Error(data.error || "Failed to send response");
      }

      onSent?.();
      onClose();
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Failed to send response");
    } finally {
      setIsSending(false);
    }
  };

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

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-lg font-medium">Reply to Question</h2>
            <p className="text-sm text-muted-foreground">
              Re: {dealName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSending}
            className="p-2 hover:bg-secondary rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Original Email Context */}
          <div className="bg-secondary/30 rounded-xl p-4">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Original Email
            </p>
            <p className="text-sm font-medium">
              From: {email.from_name || email.from_email}
            </p>
            <p className="text-sm text-muted-foreground">
              Subject: {email.subject || "(no subject)"}
            </p>
          </div>

          {/* Question being answered */}
          <div className="bg-secondary/30 rounded-xl p-4">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Question
            </p>
            <p className="text-sm">{question}</p>
          </div>

          {/* Error state */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-destructive font-medium">
                  Failed to generate AI response
                </p>
                <p className="text-sm text-destructive/80 mt-1">{error}</p>
                <button
                  type="button"
                  onClick={generateResponse}
                  className="text-sm text-destructive underline mt-2 hover:no-underline"
                >
                  Try again
                </button>
              </div>
            </div>
          )}

          {/* Response textarea */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Your Response</label>
              <button
                type="button"
                onClick={generateResponse}
                disabled={isGenerating}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? "animate-spin" : ""}`} />
                Regenerate
              </button>
            </div>

            {isGenerating && !response ? (
              <div className="border border-border rounded-xl p-8 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Generating AI response...
                </p>
              </div>
            ) : (
              <textarea
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                placeholder="Type your response here..."
                className="w-full h-64 px-4 py-3 bg-background border border-border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-sm"
                disabled={isSending}
              />
            )}
          </div>

          {/* Send error */}
          {sendError && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{sendError}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Sending to: {email.from_email}
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
              disabled={isSending || !response.trim()}
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
                  Send Reply
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
