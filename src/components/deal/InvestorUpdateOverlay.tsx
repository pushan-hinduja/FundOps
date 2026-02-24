"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Send, RefreshCw, Clock, Mail, CheckCircle2, Loader2, MessageSquare, AlertCircle } from "lucide-react";
import type { InvestorUpdate } from "@/lib/supabase/types";

interface InvestorUpdateOverlayProps {
  update: InvestorUpdate;
  dealId: string;
  dealName: string;
  companyName: string | null;
  founderEmail: string;
  onClose: () => void;
  onSent?: () => void;
}

function getStatusBadge(status: string) {
  switch (status) {
    case "pending_request":
      return (
        <span className="px-2.5 py-1 text-xs rounded-full bg-yellow-500/10 text-yellow-600 font-medium">
          Pending
        </span>
      );
    case "request_sent":
      return (
        <span className="px-2.5 py-1 text-xs rounded-full bg-blue-500/10 text-blue-600 font-medium">
          Awaiting Response
        </span>
      );
    case "response_received":
      return (
        <span className="px-2.5 py-1 text-xs rounded-full bg-green-500/10 text-green-600 font-medium">
          Ready to Send
        </span>
      );
    case "sent_to_lps":
      return (
        <span className="px-2.5 py-1 text-xs rounded-full bg-secondary text-muted-foreground font-medium">
          Sent to LPs
        </span>
      );
    default:
      return null;
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case "sent_to_lps":
      return <CheckCircle2 className="w-5 h-5 text-green-600" />;
    case "response_received":
      return <Mail className="w-5 h-5 text-green-600" />;
    default:
      return <Clock className="w-5 h-5 text-muted-foreground" />;
  }
}

/**
 * Split email body into the actual response and the quoted original request.
 * Returns { response, quotedRequest }.
 */
function splitResponseAndQuoted(text: string): { response: string; quotedRequest: string | null } {
  const lines = text.split('\n');
  let splitIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (/^On .+ wrote:\s*$/.test(trimmed)) {
      splitIndex = i;
      break;
    }
    if (trimmed.startsWith('>') && i > 0) {
      // Check if the previous line is an "On ... wrote:" line
      const prevTrimmed = lines[i - 1].trim();
      if (/^On .+ wrote:\s*$/.test(prevTrimmed)) {
        splitIndex = i - 1;
      } else {
        splitIndex = i;
      }
      break;
    }
  }

  if (splitIndex === -1) {
    return { response: text, quotedRequest: null };
  }

  const responsePart = lines.slice(0, splitIndex).join('\n').trimEnd();
  const quotedPart = lines.slice(splitIndex).join('\n');

  // Strip the "On ... wrote:" line and ">" prefixes from quoted content
  const quotedLines = quotedPart.split('\n');
  const cleanedQuoted = quotedLines
    .filter(line => !/^On .+ wrote:\s*$/.test(line.trim()))
    .map(line => line.replace(/^>\s?/, ''))
    .join('\n')
    .trim();

  return { response: responsePart, quotedRequest: cleanedQuoted || null };
}

export function InvestorUpdateOverlay({
  update,
  dealId,
  dealName,
  companyName,
  founderEmail,
  onClose,
  onSent,
}: InvestorUpdateOverlayProps) {
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // LP draft state (for response_received status)
  const [lpDraft, setLpDraft] = useState("");
  const [isGeneratingLpDraft, setIsGeneratingLpDraft] = useState(false);
  const [lpDraftError, setLpDraftError] = useState<string | null>(null);
  const [hasGeneratedLpDraft, setHasGeneratedLpDraft] = useState(false);

  // Get the stripped founder response for AI generation
  const { response: strippedResponse } = splitResponseAndQuoted(update.response_body || "");

  const generateLpDraft = useCallback(async () => {
    setIsGeneratingLpDraft(true);
    setLpDraftError(null);

    try {
      const res = await fetch("/api/ai/generate-investor-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealId,
          type: "lp_update",
          founderResponse: strippedResponse,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate draft");
      }

      const data = await res.json();
      setLpDraft(data.draft);
      setHasGeneratedLpDraft(true);
    } catch (err) {
      setLpDraftError(err instanceof Error ? err.message : "Failed to generate draft");
    } finally {
      setIsGeneratingLpDraft(false);
    }
  }, [dealId, strippedResponse]);

  // Auto-generate LP draft when viewing a response_received update
  useEffect(() => {
    if (update.status === "response_received" && !hasGeneratedLpDraft) {
      generateLpDraft();
    }
  }, [update.status, generateLpDraft, hasGeneratedLpDraft]);

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

  const handleSendToLPs = async () => {
    if (!lpDraft.trim()) {
      setSendError("Please enter a message");
      return;
    }
    if (!confirm("Send this investor update to all committed/allocated LPs?")) {
      return;
    }
    setIsSending(true);
    setSendError(null);

    try {
      const res = await fetch(
        `/api/deals/${dealId}/investor-updates/${update.id}/send-to-lps`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: lpDraft }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        alert(`Update sent to ${data.lpCount} LPs`);
        onSent?.();
        onClose();
      } else {
        const data = await res.json();
        setSendError(data.error || "Failed to send to LPs");
      }
    } catch {
      setSendError("Failed to send to LPs");
    } finally {
      setIsSending(false);
    }
  };

  const dueDate = new Date(update.due_date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            {getStatusIcon(update.status)}
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-medium text-foreground">
                  Update #{update.update_number}
                </h2>
                {getStatusBadge(update.status)}
              </div>
              <p className="text-sm text-muted-foreground">
                {companyName || dealName} &middot; Due {dueDate}
              </p>
            </div>
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
        <div className={`flex-1 p-6 flex flex-col min-h-0 ${update.status !== "response_received" ? "overflow-y-auto" : ""}`}>
          {update.status === "pending_request" && (
            <div className="text-center py-8">
              <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                Update request will be sent automatically to{" "}
                <span className="font-medium text-foreground">{founderEmail}</span>.
              </p>
            </div>
          )}

          {update.status === "request_sent" && (
            <div className="text-center py-8">
              <Mail className="w-8 h-8 text-blue-500 mx-auto mb-3" />
              <p className="text-sm font-medium mb-1">Request Sent</p>
              <p className="text-sm text-muted-foreground">
                Sent to {founderEmail}
                {update.request_sent_at && (
                  <> on{" "}
                    {new Date(update.request_sent_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </>
                )}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Waiting for founder response...
              </p>
            </div>
          )}

          {update.status === "response_received" && (() => {
            const { response: founderResponse, quotedRequest } = splitResponseAndQuoted(update.response_body || "");
            return (
              <div className="flex-1 flex flex-col min-h-0">
                {/* Timeline section - scrolls independently */}
                <div className="flex-1 overflow-y-auto min-h-0">
                  {/* Founder Response */}
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center bg-green-500/10">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-foreground">Founder Response</p>
                        {update.response_received_at && (
                          <p className="text-xs text-muted-foreground">
                            Received{" "}
                            {new Date(update.response_received_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="ml-9 mt-2">
                    <div className="bg-secondary/30 rounded-xl p-4 text-sm text-foreground whitespace-pre-wrap">
                      {founderResponse}
                    </div>
                  </div>

                  {quotedRequest && (
                    <>
                      {/* Timeline connector */}
                      <div className="ml-3 my-3 border-l-2 border-border h-3" />

                      {/* Request for Update */}
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center bg-blue-500/10">
                          <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">Request for Update</p>
                        </div>
                      </div>
                      <div className="ml-9 mt-2">
                        <div className="bg-secondary/30 rounded-xl p-4 text-sm text-foreground whitespace-pre-wrap">
                          {quotedRequest}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Divider + Email to LPs draft - always visible */}
                <div className="border-t border-border pt-4 mt-2 shrink-0">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-foreground">Email to LPs</label>
                    <button
                      type="button"
                      onClick={generateLpDraft}
                      disabled={isGeneratingLpDraft}
                      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingLpDraft ? "animate-spin" : ""}`} />
                      Regenerate
                    </button>
                  </div>

                  {lpDraftError && (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex items-start gap-3 mb-3">
                      <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm text-destructive font-medium">Failed to generate draft</p>
                        <p className="text-sm text-destructive/80 mt-1">{lpDraftError}</p>
                        <button
                          type="button"
                          onClick={generateLpDraft}
                          className="text-sm text-destructive underline mt-2 hover:no-underline"
                        >
                          Try again
                        </button>
                      </div>
                    </div>
                  )}

                  {isGeneratingLpDraft && !lpDraft ? (
                    <div className="border border-border rounded-xl p-8 flex flex-col items-center justify-center gap-3">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Generating draft...</p>
                    </div>
                  ) : (
                    <textarea
                      value={lpDraft}
                      onChange={(e) => setLpDraft(e.target.value)}
                      placeholder="Type your update to LPs here..."
                      className="w-full min-h-[10rem] px-4 py-3 bg-background border border-border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-sm text-foreground"
                      disabled={isSending}
                    />
                  )}

                  {sendError && (
                    <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-sm text-destructive">
                      {sendError}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {update.status === "sent_to_lps" && (() => {
            const { response: founderResponse, quotedRequest } = splitResponseAndQuoted(update.response_body || "");
            return (
              <div>
                {/* Update Sent to LPs */}
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center bg-green-500/10">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground">Update Sent to LPs</p>
                      {update.lp_email_sent_at && (
                        <p className="text-xs text-muted-foreground">
                          Sent{" "}
                          {new Date(update.lp_email_sent_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                {update.response_body && (
                  <div className="ml-9 mt-2">
                    <div className="bg-secondary/30 rounded-xl p-4 text-sm text-foreground whitespace-pre-wrap max-h-[40vh] overflow-y-auto">
                      {founderResponse}
                    </div>
                  </div>
                )}

                {quotedRequest && (
                  <>
                    {/* Timeline connector */}
                    <div className="ml-3 my-3 border-l-2 border-border h-3" />

                    {/* Request for Update */}
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center bg-blue-500/10">
                        <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">Request for Update</p>
                      </div>
                    </div>
                    <div className="ml-9 mt-2">
                      <div className="bg-secondary/30 rounded-xl p-4 text-sm text-foreground whitespace-pre-wrap max-h-[30vh] overflow-y-auto">
                        {quotedRequest}
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border shrink-0">
          {update.status === "response_received" ? (
            <>
              <p className="text-xs text-muted-foreground">
                From: {founderEmail}
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
                  onClick={handleSendToLPs}
                  disabled={isSending || !lpDraft.trim()}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send Update to LPs
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                {update.status === "sent_to_lps"
                  ? "Update delivered"
                  : `Founder: ${founderEmail}`}
              </p>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary rounded-lg transition-colors"
              >
                Close
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
