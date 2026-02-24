"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Mail,
  Clock,
  CheckCircle2,
  Send,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Settings,
  CalendarDays,
} from "lucide-react";
import type { InvestorUpdate, InvestorUpdateFrequency } from "@/lib/supabase/types";
import { INVESTOR_UPDATE_FREQUENCY_LABELS } from "@/lib/supabase/types";

interface InvestorUpdatesCardProps {
  dealId: string;
  dealName: string;
  companyName: string | null;
  closeDate: string | null;
  founderEmail: string | null;
  investorUpdateFrequency: InvestorUpdateFrequency | null;
}

function getNextUpdateDate(
  closeDate: string,
  frequency: InvestorUpdateFrequency
): Date {
  const monthsInterval =
    frequency === "monthly"
      ? 1
      : frequency === "quarterly"
        ? 3
        : frequency === "semi_annual"
          ? 6
          : 12;

  const now = new Date();
  const nextDate = new Date(closeDate);

  while (nextDate <= now) {
    nextDate.setMonth(nextDate.getMonth() + monthsInterval);
  }

  return nextDate;
}

function getStatusBadge(status: string) {
  switch (status) {
    case "pending_request":
      return (
        <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-500/20 text-yellow-400">
          Pending
        </span>
      );
    case "request_sent":
      return (
        <span className="px-2 py-0.5 text-xs rounded-full bg-blue-500/20 text-blue-400">
          Awaiting Response
        </span>
      );
    case "response_received":
      return (
        <span className="px-2 py-0.5 text-xs rounded-full bg-green-500/20 text-green-400">
          Ready to Send
        </span>
      );
    case "sent_to_lps":
      return (
        <span className="px-2 py-0.5 text-xs rounded-full bg-white/10 text-white/70">
          Sent to LPs
        </span>
      );
    default:
      return null;
  }
}

export function InvestorUpdatesCard({
  dealId,
  dealName,
  companyName,
  closeDate,
  founderEmail: initialFounderEmail,
  investorUpdateFrequency: initialFrequency,
}: InvestorUpdatesCardProps) {
  const router = useRouter();
  const [updates, setUpdates] = useState<InvestorUpdate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedUpdateId, setExpandedUpdateId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState<string | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Inline editing state
  const [founderEmail, setFounderEmail] = useState(initialFounderEmail || "");
  const [frequency, setFrequency] = useState(initialFrequency || "");
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const fetchUpdates = useCallback(async () => {
    try {
      const res = await fetch(`/api/deals/${dealId}/investor-updates`);
      if (res.ok) {
        const data = await res.json();
        setUpdates(data.updates);
      }
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  }, [dealId]);

  useEffect(() => {
    fetchUpdates();
  }, [fetchUpdates]);

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      const res = await fetch(`/api/deals/${dealId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          founder_email: founderEmail || null,
          investor_update_frequency: frequency || null,
        }),
      });
      if (res.ok) {
        setShowSettings(false);
        router.refresh();
      }
    } catch {
      // silently fail
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleRequestUpdate = async () => {
    setIsRequesting(true);
    try {
      const res = await fetch(`/api/deals/${dealId}/investor-updates`, {
        method: "POST",
      });
      if (res.ok) {
        await fetchUpdates();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to request update");
      }
    } catch {
      alert("Failed to request update");
    } finally {
      setIsRequesting(false);
    }
  };

  const handleSendToLPs = async (updateId: string) => {
    if (!confirm("Send this investor update to all committed/allocated LPs?")) {
      return;
    }
    setIsSending(updateId);
    try {
      const res = await fetch(
        `/api/deals/${dealId}/investor-updates/${updateId}/send-to-lps`,
        { method: "POST" }
      );
      if (res.ok) {
        const data = await res.json();
        alert(`Update sent to ${data.lpCount} LPs`);
        await fetchUpdates();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to send to LPs");
      }
    } catch {
      alert("Failed to send to LPs");
    } finally {
      setIsSending(null);
    }
  };

  const isConfigured = founderEmail && frequency;
  const nextUpdateDate =
    closeDate && frequency
      ? getNextUpdateDate(closeDate, frequency as InvestorUpdateFrequency)
      : null;

  return (
    <div className="glass-card-updates rounded-2xl overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="p-5 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-white/60" />
            <h3 className="text-lg font-medium text-white">Investor Updates</h3>
          </div>
          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
            title="Settings"
          >
            <Settings className="w-4 h-4 text-white/60" />
          </button>
        </div>
      </div>

      {/* Settings (collapsible) */}
      {showSettings && (
        <div className="p-5 border-b border-white/10 bg-white/5">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1">
                Founder/Company Email
              </label>
              <input
                type="email"
                value={founderEmail}
                onChange={(e) => setFounderEmail(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-white/10 rounded-lg bg-white/5 text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-white/20"
                placeholder="founder@company.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1">
                Update Frequency
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-white/10 rounded-lg bg-white/5 text-white focus:outline-none focus:ring-1 focus:ring-white/20"
              >
                <option value="">Not set</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="semi_annual">Semi-Annual</option>
                <option value="annual">Annual</option>
              </select>
            </div>
            <button
              type="button"
              onClick={handleSaveSettings}
              disabled={isSavingSettings}
              className="w-full px-3 py-2 text-sm font-medium bg-white/15 hover:bg-white/20 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {isSavingSettings ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-5 flex-1 overflow-y-auto">
        {/* Configuration prompt */}
        {!isConfigured && !showSettings && (
          <div className="text-center py-4">
            <p className="text-sm text-white/50 mb-3">
              Set up investor update frequency and founder email to get started.
            </p>
            <button
              type="button"
              onClick={() => setShowSettings(true)}
              className="px-4 py-2 text-sm font-medium bg-white/15 hover:bg-white/20 text-white rounded-lg transition-colors"
            >
              Configure Updates
            </button>
          </div>
        )}

        {isConfigured && (
          <>
            {/* Next Update */}
            {nextUpdateDate && (
              <div className="flex items-center gap-2 mb-4 p-3 rounded-xl bg-white/5">
                <CalendarDays className="w-4 h-4 text-white/50 flex-shrink-0" />
                <div className="text-sm">
                  <span className="text-white/60">Next update: </span>
                  <span className="font-medium text-white">
                    {nextUpdateDate.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                  <span className="text-white/50 ml-1">
                    ({INVESTOR_UPDATE_FREQUENCY_LABELS[frequency as InvestorUpdateFrequency]})
                  </span>
                </div>
              </div>
            )}

            {/* Current config summary */}
            <div className="flex items-center gap-3 mb-4 text-xs text-white/50">
              <span>To: {founderEmail}</span>
            </div>

            {/* Request Update Button */}
            <button
              type="button"
              onClick={handleRequestUpdate}
              disabled={isRequesting}
              className="w-full mb-4 px-3 py-2 text-sm font-medium border border-white/10 rounded-lg hover:bg-white/10 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isRequesting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Sending Request...
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  Request Update Now
                </>
              )}
            </button>

            {/* Update History */}
            {isLoading ? (
              <div className="text-sm text-white/50 text-center py-4">
                Loading updates...
              </div>
            ) : updates.length === 0 ? (
              <div className="text-sm text-white/50 text-center py-4">
                No investor updates yet. Updates will be automatically requested
                based on your configured frequency.
              </div>
            ) : (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-white/50 uppercase tracking-wider mb-2">
                  Update History
                </h4>
                {updates.map((update) => (
                  <div
                    key={update.id}
                    className="border border-white/10 rounded-xl overflow-hidden"
                  >
                    {/* Update header */}
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedUpdateId(
                          expandedUpdateId === update.id ? null : update.id
                        )
                      }
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {update.status === "sent_to_lps" ? (
                          <CheckCircle2 className="w-4 h-4 text-green-400" />
                        ) : update.status === "response_received" ? (
                          <Mail className="w-4 h-4 text-green-400" />
                        ) : (
                          <Clock className="w-4 h-4 text-white/50" />
                        )}
                        <div className="text-left">
                          <div className="text-sm font-medium text-white">
                            Update #{update.update_number}
                          </div>
                          <div className="text-xs text-white/50">
                            Due:{" "}
                            {new Date(update.due_date).toLocaleDateString(
                              "en-US",
                              { month: "short", day: "numeric", year: "numeric" }
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(update.status)}
                        {expandedUpdateId === update.id ? (
                          <ChevronUp className="w-4 h-4 text-white/50" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-white/50" />
                        )}
                      </div>
                    </button>

                    {/* Expanded content */}
                    {expandedUpdateId === update.id && (
                      <div className="px-4 pb-4 border-t border-white/10 pt-3">
                        {update.status === "pending_request" && (
                          <p className="text-sm text-white/50">
                            Update request will be sent automatically.
                          </p>
                        )}

                        {update.status === "request_sent" && (
                          <div className="text-sm text-white/50">
                            <p>
                              Request sent{" "}
                              {update.request_sent_at &&
                                new Date(
                                  update.request_sent_at
                                ).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                            </p>
                            <p className="mt-1">
                              Waiting for founder response...
                            </p>
                          </div>
                        )}

                        {update.status === "response_received" && (
                          <div>
                            <div className="mb-3">
                              <p className="text-xs font-medium text-white/60 mb-1">
                                Founder Response:
                              </p>
                              <div className="text-sm bg-white/5 rounded-lg p-3 max-h-48 overflow-y-auto whitespace-pre-wrap text-white/80">
                                {update.response_body}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleSendToLPs(update.id)}
                              disabled={isSending === update.id}
                              className="w-full px-3 py-2 text-sm font-medium bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                              {isSending === update.id ? (
                                <>
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  Sending to LPs...
                                </>
                              ) : (
                                <>
                                  <Send className="w-3.5 h-3.5" />
                                  Send Update to LPs
                                </>
                              )}
                            </button>
                          </div>
                        )}

                        {update.status === "sent_to_lps" && (
                          <div className="text-sm text-white/50">
                            <p>
                              Sent to LPs on{" "}
                              {update.lp_email_sent_at &&
                                new Date(
                                  update.lp_email_sent_at
                                ).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                            </p>
                            {update.response_body && (
                              <div className="mt-2 bg-white/5 rounded-lg p-3 max-h-32 overflow-y-auto whitespace-pre-wrap text-xs text-white/60">
                                {update.response_body}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
