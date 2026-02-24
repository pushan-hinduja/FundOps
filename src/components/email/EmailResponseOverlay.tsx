"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { X, RefreshCw, Send, Loader2, AlertCircle, CheckCircle2, MessageSquare } from "lucide-react";

interface EmailData {
  id: string;
  from_email: string;
  from_name: string | null;
  subject: string | null;
  body_text: string | null;
  thread_id: string | null;
  message_id: string | null;
}

interface EmailResponseData {
  final_response: string;
  sent_at: string;
  question_text: string;
}

interface EmailResponseOverlayProps {
  email: EmailData;
  questions: string[];
  responses: EmailResponseData[];
  scrollToQuestion?: string;
  questionBodies?: Record<string, string | null>;
  dealId: string;
  dealName: string;
  onClose: () => void;
  onSent?: () => void;
}

/**
 * Strip quoted thread content from email body text.
 * Removes "On ... wrote:" blocks, lines starting with ">", and other quote markers.
 */
function stripQuotedContent(text: string): string {
  const lines = text.split('\n');
  const result: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    // Stop at "On ... wrote:" pattern (Gmail / Apple Mail)
    if (/^On .+ wrote:\s*$/.test(trimmed)) break;

    // Stop at quoted lines (lines starting with >)
    if (trimmed.startsWith('>')) break;

    // Stop at "---------- Forwarded message ----------"
    if (/^-{5,}\s*Forwarded message\s*-{5,}/.test(trimmed)) break;

    // Stop at Outlook-style separator followed by From:
    if (/^_{5,}$/.test(trimmed) || (/^-{3,}$/.test(trimmed) && i + 1 < lines.length && /^From:/i.test(lines[i + 1].trim()))) break;

    result.push(lines[i]);
  }

  // Trim trailing empty lines
  while (result.length > 0 && result[result.length - 1].trim() === '') {
    result.pop();
  }

  return result.join('\n');
}

export function EmailResponseOverlay({
  email,
  questions,
  responses,
  scrollToQuestion,
  questionBodies,
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
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [expandedEmails, setExpandedEmails] = useState<Set<number>>(new Set());

  const toggleEmailExpansion = (index: number) => {
    setExpandedEmails((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  // Get the body text for a given question
  const getBodyForQuestion = (q: string): string | null => {
    if (questionBodies && questionBodies[q]) return questionBodies[q];
    return email.body_text;
  };

  // Determine which questions are answered vs unanswered
  const getResponseForQuestion = (q: string) =>
    responses.find((r) => r.question_text === q);

  const unansweredQuestions = questions.filter((q) => !getResponseForQuestion(q));
  const allAnswered = unansweredQuestions.length === 0;

  const generateResponse = useCallback(async () => {
    if (unansweredQuestions.length === 0) return;
    setIsGenerating(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/generate-response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailId: email.id,
          questions: unansweredQuestions,
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
  }, [email.id, unansweredQuestions, dealId]);

  // Auto-generate on mount if there are unanswered questions
  useEffect(() => {
    if (!hasGenerated && !allAnswered) {
      generateResponse();
    }
  }, [generateResponse, hasGenerated, allAnswered]);

  // Auto-scroll to clicked question
  useEffect(() => {
    if (scrollToQuestion && scrollContainerRef.current) {
      const index = questions.indexOf(scrollToQuestion);
      if (index >= 0) {
        const el = scrollContainerRef.current.querySelector(`[data-question-index="${index}"]`);
        if (el) {
          setTimeout(() => {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
          }, 100);
        }
      }
    }
  }, [scrollToQuestion, questions]);

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
          questions: unansweredQuestions,
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
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-lg font-medium">
              {allAnswered ? "Sent Responses" : "Reply to Questions"}
            </h2>
            <p className="text-sm text-muted-foreground">
              Re: {dealName} &middot; {email.from_name || email.from_email}
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

        {/* Content — scrollable timeline */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
          {/* Question thread */}
          {questions.map((q, index) => {
            const matchedResponse = getResponseForQuestion(q);
            const isAnswered = !!matchedResponse;

            return (
              <div
                key={index}
                data-question-index={index}
                className="relative"
              >
                {/* Question */}
                <div className={`flex items-start gap-3 ${
                  scrollToQuestion === q ? "bg-secondary/30 -mx-2 px-2 py-2 rounded-xl" : ""
                }`}>
                  <div className={`mt-0.5 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                    isAnswered ? "bg-green-500/10" : "bg-yellow-500/10"
                  }`}>
                    {isAnswered ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                    ) : (
                      <MessageSquare className="w-3.5 h-3.5 text-yellow-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{q}</p>
                    {isAnswered && matchedResponse.sent_at && (
                      <p className="text-[11px] text-green-600 dark:text-green-400 mt-0.5">
                        Answered {new Date(matchedResponse.sent_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    )}
                    {/* View full email toggle — per question */}
                    {getBodyForQuestion(q) && (
                      <>
                        <button
                          type="button"
                          onClick={() => toggleEmailExpansion(index)}
                          className="text-[11px] text-muted-foreground hover:text-foreground mt-1 transition-colors underline"
                        >
                          {expandedEmails.has(index) ? "Hide Full Email" : "View Full Email"}
                        </button>
                        {expandedEmails.has(index) && (
                          <div className="mt-2 p-3 bg-secondary/20 rounded-lg text-xs text-muted-foreground whitespace-pre-wrap max-h-48 overflow-y-auto">
                            {stripQuotedContent(getBodyForQuestion(q)!)}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Sent response for this question */}
                {isAnswered && (
                  <div className="ml-9 mt-2 mb-1">
                    <div className="bg-secondary/30 rounded-xl p-3 text-sm whitespace-pre-wrap max-h-48 overflow-y-auto">
                      {matchedResponse.final_response}
                    </div>
                  </div>
                )}

                {/* Divider between questions */}
                {index < questions.length - 1 && (
                  <div className="ml-3 my-3 border-l-2 border-border h-3" />
                )}
              </div>
            );
          })}

          {/* AI response section for unanswered questions */}
          {!allAnswered && (
            <>
              <div className="border-t border-border pt-4 mt-2 flex-1 flex flex-col">
                {/* Error state */}
                {error && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex items-start gap-3 mb-4">
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
                <div className="flex-1 flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium">
                      {unansweredQuestions.length === 1 ? "Your Response" : `Response to ${unansweredQuestions.length} Questions`}
                    </label>
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
                      className="w-full min-h-[16rem] flex-1 px-4 py-3 bg-background border border-border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-sm"
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
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border shrink-0">
          {allAnswered ? (
            <>
              <p className="text-xs text-muted-foreground">
                All questions answered
              </p>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary rounded-lg transition-colors"
              >
                Close
              </button>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
