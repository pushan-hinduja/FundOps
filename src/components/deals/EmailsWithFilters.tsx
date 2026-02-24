"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { EmailResponseOverlay } from "@/components/email/EmailResponseOverlay";

type EmailFilter = "all" | "questions" | "interest" | "commitments" | "wires";

interface EmailResponse {
  final_response: string;
  sent_at: string;
  question_text: string;
}

interface EmailRawData {
  id: string;
  from_name: string | null;
  from_email: string;
  subject: string | null;
  received_at: string;
  body_text: string | null;
  thread_id: string | null;
  message_id: string | null;
  email_responses?: EmailResponse[];
}

interface ParsedEmail {
  id: string;
  intent: string | null;
  commitment_amount: number | null;
  sentiment: string | null;
  extracted_questions: string[] | null;
  has_wire_details: boolean | null;
  processing_status: string | null;
  is_answered: boolean;
  emails_raw: EmailRawData | null;
  lp_contacts: {
    name: string;
    firm: string | null;
  } | null;
}

// A grouped representation of one or more emails in the same thread from the same sender
interface GroupedEmail {
  key: string;
  // Display info (from the most recent email)
  displayName: string;
  firm: string | null;
  subject: string | null;
  receivedAt: string;
  // The primary email (most recent) — used for the overlay
  primaryEmail: EmailRawData;
  // Merged data from all emails in the group
  allQuestions: string[];
  allResponses: EmailResponse[];
  intents: Set<string>;
  totalCommitmentAmount: number | null;
  hasWireDetails: boolean;
  hasUrgent: boolean;
  hasManualReview: boolean;
  // Map question text → source email body_text
  questionBodies: Record<string, string | null>;
  // Original parsed emails (for filtering)
  parsedEmails: ParsedEmail[];
}

interface SelectedEmailQuestions {
  email: EmailRawData;
  questions: string[];
  responses: EmailResponse[];
  scrollToQuestion?: string;
  questionBodies: Record<string, string | null>;
}

interface EmailsWithFiltersProps {
  emails: ParsedEmail[];
  dealId?: string;
  dealName?: string;
}

function getIntentDisplay(intent: string): { label: string; color: string } {
  switch (intent) {
    case "interested":
      return {
        label: "Interested",
        color: "bg-secondary text-blue-600",
      };
    case "committed":
      return {
        label: "Committed",
        color: "bg-secondary text-green-600",
      };
    case "declined":
      return {
        label: "Declined",
        color: "bg-secondary text-red-600",
      };
    case "question":
      return {
        label: "Question",
        color: "bg-secondary text-yellow-600",
      };
    default:
      return {
        label: intent,
        color: "bg-secondary text-muted-foreground",
      };
  }
}

function stripRePrefix(subject: string | null): string | null {
  if (!subject) return subject;
  return subject.replace(/^(Re:\s*)+/i, "").trim() || subject;
}

export function EmailsWithFilters({ emails, dealId, dealName }: EmailsWithFiltersProps) {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<EmailFilter>("all");
  const [selectedEmail, setSelectedEmail] = useState<SelectedEmailQuestions | null>(null);

  // Group emails by thread_id + from_email
  const groupedEmails = useMemo(() => {
    const groups = new Map<string, GroupedEmail>();

    for (const parsed of emails) {
      if (!parsed.emails_raw) continue;

      const raw = parsed.emails_raw;
      // Group key: thread_id + from_email, or email id if no thread
      const groupKey = raw.thread_id
        ? `${raw.thread_id}::${raw.from_email.toLowerCase()}`
        : raw.id;

      const existing = groups.get(groupKey);
      if (existing) {
        // Merge into existing group
        existing.parsedEmails.push(parsed);

        // Merge questions (deduplicate) and track source email body
        const existingQSet = new Set(existing.allQuestions);
        for (const q of parsed.extracted_questions || []) {
          if (!existingQSet.has(q)) {
            existing.allQuestions.push(q);
            existing.questionBodies[q] = raw.body_text || null;
          }
        }

        // Merge responses (deduplicate by question_text)
        const existingRSet = new Set(existing.allResponses.map((r) => r.question_text));
        for (const r of raw.email_responses || []) {
          if (!existingRSet.has(r.question_text)) {
            existing.allResponses.push(r);
          }
        }

        // Merge intents
        if (parsed.intent) existing.intents.add(parsed.intent);

        // Merge amounts
        if (parsed.commitment_amount) {
          existing.totalCommitmentAmount =
            (existing.totalCommitmentAmount || 0) + parsed.commitment_amount;
        }

        // Merge flags
        if (parsed.has_wire_details) existing.hasWireDetails = true;
        if (parsed.sentiment === "urgent") existing.hasUrgent = true;
        if (parsed.processing_status === "manual_review") existing.hasManualReview = true;

        // Update to most recent email if newer
        if (raw.received_at > existing.receivedAt) {
          existing.receivedAt = raw.received_at;
          existing.primaryEmail = raw;
        }
      } else {
        // Create new group
        const initialQuestions = parsed.extracted_questions || [];
        const initialBodies: Record<string, string | null> = {};
        for (const q of initialQuestions) {
          initialBodies[q] = raw.body_text || null;
        }

        groups.set(groupKey, {
          key: groupKey,
          displayName:
            parsed.lp_contacts?.name || raw.from_name || raw.from_email,
          firm: parsed.lp_contacts?.firm || null,
          subject: stripRePrefix(raw.subject),
          receivedAt: raw.received_at,
          primaryEmail: raw,
          allQuestions: [...initialQuestions],
          allResponses: [...(raw.email_responses || [])],
          intents: new Set(parsed.intent ? [parsed.intent] : []),
          totalCommitmentAmount: parsed.commitment_amount,
          hasWireDetails: parsed.has_wire_details === true,
          hasUrgent: parsed.sentiment === "urgent",
          hasManualReview: parsed.processing_status === "manual_review",
          questionBodies: initialBodies,
          parsedEmails: [parsed],
        });
      }
    }

    // Sort by most recent first
    return Array.from(groups.values()).sort(
      (a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
    );
  }, [emails]);

  // Filter groups based on active filter
  const filteredGroups = groupedEmails.filter((group) => {
    switch (activeFilter) {
      case "questions":
        return group.allQuestions.length > 0;
      case "interest":
        return group.intents.has("interested");
      case "commitments":
        return group.intents.has("committed") || (group.totalCommitmentAmount != null && group.totalCommitmentAmount > 0);
      case "wires":
        return group.hasWireDetails;
      case "all":
      default:
        return true;
    }
  });

  const handleQuestionClick = (group: GroupedEmail, clickedQuestion: string) => {
    if (!dealId || !dealName) return;

    setSelectedEmail({
      email: {
        id: group.primaryEmail.id,
        from_email: group.primaryEmail.from_email,
        from_name: group.primaryEmail.from_name,
        subject: group.primaryEmail.subject,
        received_at: group.primaryEmail.received_at,
        body_text: group.primaryEmail.body_text || null,
        thread_id: group.primaryEmail.thread_id || null,
        message_id: group.primaryEmail.message_id || null,
        email_responses: group.allResponses,
      },
      questions: group.allQuestions,
      responses: group.allResponses,
      scrollToQuestion: clickedQuestion,
      questionBodies: group.questionBodies,
    });
  };

  const filters: { key: EmailFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "questions", label: "Questions" },
    { key: "interest", label: "Interest" },
    { key: "commitments", label: "Commitments" },
    { key: "wires", label: "Wires" },
  ];

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      {/* Header with filters */}
      <div className="px-6 py-4 border-b border-border">
        <h2 className="text-lg font-medium mb-3">
          Related Emails ({filteredGroups.length})
        </h2>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          {filters.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => setActiveFilter(filter.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeFilter === filter.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary hover:bg-secondary/80 text-foreground"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Email List */}
      {filteredGroups.length > 0 ? (
        <div className="divide-y divide-border">
          {filteredGroups.slice(0, 10).map((group) => (
            <div key={group.key} className="px-6 py-4">
              {/* Header */}
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-medium text-sm">{group.displayName}</p>
                  {group.firm && (
                    <p className="text-xs text-muted-foreground">
                      {group.firm}
                    </p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                  {formatDistanceToNow(new Date(group.receivedAt), {
                    addSuffix: true,
                  })}
                </span>
              </div>

              {/* Subject */}
              <p className="text-sm font-medium mb-2">
                {group.subject || "(no subject)"}
              </p>

              {/* Tags */}
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                {Array.from(group.intents).map((intent) => {
                  const intentDisplay = getIntentDisplay(intent);
                  return (
                    <span
                      key={intent}
                      className={`text-xs px-2 py-1 rounded-lg font-medium ${intentDisplay.color}`}
                    >
                      {intentDisplay.label}
                    </span>
                  );
                })}
                {group.allQuestions.length > 0 && !group.intents.has("question") && (
                  <span className="text-xs px-2 py-1 rounded-lg bg-secondary text-yellow-600 font-medium">
                    Question
                  </span>
                )}
                {group.totalCommitmentAmount != null && group.totalCommitmentAmount > 0 && (
                  <span className="text-xs px-2 py-1 rounded-lg bg-success/10 text-success font-medium">
                    ${(group.totalCommitmentAmount / 1000).toFixed(0)}K
                  </span>
                )}
                {group.hasWireDetails && (
                  <span className="text-xs px-2 py-1 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 font-medium">
                    Wire Details
                  </span>
                )}
                {group.hasUrgent && (
                  <span className="text-xs px-2 py-0.5 rounded-lg bg-secondary text-red-600 font-medium">
                    Urgent
                  </span>
                )}
                {group.hasManualReview && (
                  <span className="text-xs px-2 py-0.5 rounded-lg bg-secondary text-yellow-600 font-medium">
                    Low Confidence
                  </span>
                )}
              </div>

              {/* Questions */}
              {group.allQuestions.length > 0 && (
                <div className="mt-3 p-3 bg-secondary/30 rounded-lg">
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Questions:
                  </p>
                  <ul className="text-xs space-y-1">
                    {group.allQuestions.slice(0, 5).map((q, i) => {
                      const matchedResponse = group.allResponses.find(
                        (r) => r.question_text === q
                      );
                      return (
                        <li
                          key={i}
                          className={`text-foreground ${
                            dealId && dealName
                              ? "cursor-pointer hover:bg-secondary/50 rounded px-2 py-1 -mx-2 transition-colors"
                              : ""
                          }`}
                          onClick={() =>
                            dealId && dealName && handleQuestionClick(group, q)
                          }
                          title={
                            dealId && dealName
                              ? matchedResponse
                                ? "Click to view response"
                                : "Click to reply"
                              : undefined
                          }
                        >
                          <span>• {q}</span>
                          {matchedResponse && matchedResponse.sent_at && (
                            <span className="block text-[11px] text-green-600 dark:text-green-400 ml-3 mt-0.5">
                              Answered{" "}
                              {new Date(
                                matchedResponse.sent_at
                              ).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </span>
                          )}
                        </li>
                      );
                    })}
                    {group.allQuestions.length > 5 && (
                      <li className="text-muted-foreground italic">
                        +{group.allQuestions.length - 5} more
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 px-6">
          <p className="text-sm text-muted-foreground mb-3">
            {activeFilter === "all"
              ? "No emails matched to this deal yet."
              : `No emails with ${activeFilter} found.`}
          </p>
          {activeFilter === "all" && (
            <p className="text-xs text-muted-foreground">
              Sync emails to see them here.
            </p>
          )}
        </div>
      )}

      {/* Email Response Overlay */}
      {selectedEmail && dealId && dealName && (
        <EmailResponseOverlay
          email={selectedEmail.email}
          questions={selectedEmail.questions}
          responses={selectedEmail.responses}
          scrollToQuestion={selectedEmail.scrollToQuestion}
          questionBodies={selectedEmail.questionBodies}
          dealId={dealId}
          dealName={dealName}
          onClose={() => setSelectedEmail(null)}
          onSent={() => router.refresh()}
        />
      )}
    </div>
  );
}
