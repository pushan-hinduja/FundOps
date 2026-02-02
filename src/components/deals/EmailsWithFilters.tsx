"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";

type EmailFilter = "all" | "questions" | "interest" | "wires";

interface ParsedEmail {
  id: string;
  intent: string | null;
  commitment_amount: number | null;
  sentiment: string | null;
  extracted_questions: string[] | null;
  has_wire_details: boolean | null;
  processing_status: string | null;
  emails_raw: {
    from_name: string | null;
    from_email: string;
    subject: string | null;
    received_at: string;
  } | null;
  lp_contacts: {
    name: string;
    firm: string | null;
  } | null;
}

interface EmailsWithFiltersProps {
  emails: ParsedEmail[];
}

function getIntentDisplay(intent: string): { label: string; color: string } {
  switch (intent) {
    case "interested":
      return {
        label: "Interested",
        color: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400 border border-blue-300 dark:border-blue-800",
      };
    case "committed":
      return {
        label: "Committed",
        color: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400 border border-green-300 dark:border-green-800",
      };
    case "declined":
      return {
        label: "Declined",
        color: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400 border border-red-300 dark:border-red-800",
      };
    case "question":
      return {
        label: "Question",
        color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400 border border-yellow-300 dark:border-yellow-800",
      };
    default:
      return {
        label: intent,
        color: "bg-secondary text-muted-foreground border border-border",
      };
  }
}

export function EmailsWithFilters({ emails }: EmailsWithFiltersProps) {
  const [activeFilter, setActiveFilter] = useState<EmailFilter>("all");

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
    <div className="bg-card border border-border rounded-2xl p-6">
      {/* Header with filters */}
      <div className="mb-4">
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
        <div className="space-y-4">
          {filteredEmails.slice(0, 10).map((parsed) => (
            <div
              key={parsed.id}
              className="p-4 border border-border rounded-xl hover:bg-secondary/30 transition-colors"
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
                <span className="text-xs text-muted-foreground">
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
                  <span className="text-xs px-2 py-1 rounded-lg bg-destructive/10 text-destructive font-medium">
                    Urgent
                  </span>
                )}
                {parsed.processing_status === "manual_review" && (
                  <span className="text-xs px-2 py-1 rounded-lg bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 font-medium">
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
                        <li key={i} className="text-foreground">
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
        <div className="text-center py-8">
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
    </div>
  );
}
