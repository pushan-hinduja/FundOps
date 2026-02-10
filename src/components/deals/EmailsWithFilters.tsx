"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { EmailResponseOverlay } from "@/components/email/EmailResponseOverlay";

type EmailFilter = "all" | "questions" | "interest" | "wires";

interface EmailRawData {
  id: string;
  from_name: string | null;
  from_email: string;
  subject: string | null;
  received_at: string;
  body_text: string | null;
  thread_id: string | null;
  message_id: string | null;
}

interface ParsedEmail {
  id: string;
  intent: string | null;
  commitment_amount: number | null;
  sentiment: string | null;
  extracted_questions: string[] | null;
  has_wire_details: boolean | null;
  processing_status: string | null;
  emails_raw: EmailRawData | null;
  lp_contacts: {
    name: string;
    firm: string | null;
  } | null;
}

interface SelectedQuestion {
  email: EmailRawData;
  question: string;
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

export function EmailsWithFilters({ emails, dealId, dealName }: EmailsWithFiltersProps) {
  const [activeFilter, setActiveFilter] = useState<EmailFilter>("all");
  const [selectedQuestion, setSelectedQuestion] = useState<SelectedQuestion | null>(null);

  const handleQuestionClick = (email: ParsedEmail, question: string) => {
    if (!dealId || !dealName || !email.emails_raw) return;

    setSelectedQuestion({
      email: {
        id: email.emails_raw.id,
        from_email: email.emails_raw.from_email,
        from_name: email.emails_raw.from_name,
        subject: email.emails_raw.subject,
        received_at: email.emails_raw.received_at,
        body_text: email.emails_raw.body_text || null,
        thread_id: email.emails_raw.thread_id || null,
        message_id: email.emails_raw.message_id || null,
      },
      question,
    });
  };

  // Filter emails based on active filter
  const filteredEmails = emails.filter((email) => {
    switch (activeFilter) {
      case "questions":
        return email.extracted_questions && email.extracted_questions.length > 0;
      case "interest":
        return email.commitment_amount && email.commitment_amount > 0;
      case "wires":
        return email.has_wire_details === true;
      case "all":
      default:
        return true;
    }
  });

  const filters: { key: EmailFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "questions", label: "Questions" },
    { key: "interest", label: "Interest" },
    { key: "wires", label: "Wires" },
  ];

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      {/* Header with filters */}
      <div className="px-6 py-4 border-b border-border">
        <h2 className="text-lg font-medium mb-3">
          Related Emails ({filteredEmails.length})
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
      {filteredEmails.length > 0 ? (
        <div className="divide-y divide-border">
          {filteredEmails.slice(0, 10).map((parsed) => (
            <div
              key={parsed.id}
              className="px-6 py-4"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-medium text-sm">
                    {parsed.lp_contacts?.name ||
                      parsed.emails_raw?.from_name ||
                      parsed.emails_raw?.from_email}
                  </p>
                  {parsed.lp_contacts?.firm && (
                    <p className="text-xs text-muted-foreground">
                      {parsed.lp_contacts.firm}
                    </p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                  {parsed.emails_raw?.received_at &&
                    formatDistanceToNow(new Date(parsed.emails_raw.received_at), {
                      addSuffix: true,
                    })}
                </span>
              </div>

              {/* Subject */}
              <p className="text-sm font-medium mb-2">
                {parsed.emails_raw?.subject || "(no subject)"}
              </p>

              {/* Tags */}
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                {parsed.intent && (() => {
                  const intentDisplay = getIntentDisplay(parsed.intent);
                  return (
                    <span
                      className={`text-xs px-2 py-1 rounded-lg font-medium ${intentDisplay.color}`}
                    >
                      {intentDisplay.label}
                    </span>
                  );
                })()}
                {parsed.commitment_amount && (
                  <span className="text-xs px-2 py-1 rounded-lg bg-success/10 text-success font-medium">
                    ${(parsed.commitment_amount / 1000).toFixed(0)}K
                  </span>
                )}
                {parsed.has_wire_details && (
                  <span className="text-xs px-2 py-1 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 font-medium">
                    Wire Details
                  </span>
                )}
                {parsed.sentiment && parsed.sentiment === "urgent" && (
                  <span className="text-xs px-2 py-0.5 rounded-lg bg-secondary text-red-600 font-medium">
                    Urgent
                  </span>
                )}
                {parsed.processing_status === "manual_review" && (
                  <span className="text-xs px-2 py-0.5 rounded-lg bg-secondary text-yellow-600 font-medium">
                    Low Confidence
                  </span>
                )}
              </div>

              {/* Questions */}
              {parsed.extracted_questions &&
                parsed.extracted_questions.length > 0 && (
                  <div className="mt-3 p-3 bg-secondary/30 rounded-lg">
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Questions:
                    </p>
                    <ul className="text-xs space-y-1">
                      {parsed.extracted_questions.slice(0, 3).map((q, i) => (
                        <li
                          key={i}
                          className={`text-foreground ${
                            dealId && dealName
                              ? "cursor-pointer hover:bg-secondary/50 rounded px-2 py-1 -mx-2 transition-colors"
                              : ""
                          }`}
                          onClick={() => dealId && dealName && handleQuestionClick(parsed, q)}
                          title={dealId && dealName ? "Click to reply" : undefined}
                        >
                          • {q}
                        </li>
                      ))}
                      {parsed.extracted_questions.length > 3 && (
                        <li className="text-muted-foreground italic">
                          +{parsed.extracted_questions.length - 3} more
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
      {selectedQuestion && dealId && dealName && (
        <EmailResponseOverlay
          email={selectedQuestion.email}
          question={selectedQuestion.question}
          dealId={dealId}
          dealName={dealName}
          onClose={() => setSelectedQuestion(null)}
        />
      )}
    </div>
  );
}
