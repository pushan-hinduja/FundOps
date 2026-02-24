"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Mail,
  Clock,
  CheckCircle2,
  RefreshCw,
  Settings,
  CalendarDays,
  Send,
} from "lucide-react";
import { InvestorUpdateOverlay } from "./InvestorUpdateOverlay";
import { InvestorUpdateRequestModal } from "./InvestorUpdateRequestModal";
import { EditDealModal } from "@/components/deals/EditDealModal";
import type { InvestorUpdate, InvestorUpdateFrequency } from "@/lib/supabase/types";
import { INVESTOR_UPDATE_FREQUENCY_LABELS } from "@/lib/supabase/types";

interface DealForEdit {
  id: string;
  name: string;
  company_name: string | null;
  description: string | null;
  target_raise: number | null;
  min_check_size: number | null;
  max_check_size: number | null;
  fee_percent: number | null;
  carry_percent: number | null;
  status: string;
  memo_url: string | null;
  created_date: string | null;
  close_date: string | null;
  investment_stage: string | null;
  investment_type: string | null;
  founder_email: string | null;
  investor_update_frequency: string | null;
}

interface InvestorUpdatesCardProps {
  dealId: string;
  dealName: string;
  companyName: string | null;
  closeDate: string | null;
  founderEmail: string | null;
  investorUpdateFrequency: InvestorUpdateFrequency | null;
  deal: DealForEdit;
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
  founderEmail,
  investorUpdateFrequency,
  deal,
}: InvestorUpdatesCardProps) {
  const router = useRouter();
  const [updates, setUpdates] = useState<InvestorUpdate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUpdate, setSelectedUpdate] = useState<InvestorUpdate | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

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

  const isConfigured = founderEmail && investorUpdateFrequency;
  const nextUpdateDate =
    closeDate && investorUpdateFrequency
      ? getNextUpdateDate(closeDate, investorUpdateFrequency)
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
            onClick={() => setShowEditModal(true)}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
            title="Settings"
          >
            <Settings className="w-4 h-4 text-white/60" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex-1 overflow-y-auto">
        {/* Configuration prompt */}
        {!isConfigured && (
          <div className="text-center py-4">
            <p className="text-sm text-white/50 mb-3">
              Set up investor update frequency and founder email to get started.
            </p>
            <button
              type="button"
              onClick={() => setShowEditModal(true)}
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
                    ({INVESTOR_UPDATE_FREQUENCY_LABELS[investorUpdateFrequency!]})
                  </span>
                </div>
              </div>
            )}

            {/* Current config summary */}
            <div className="flex items-center gap-3 mb-4 text-xs text-white/50">
              <span>To: {founderEmail || ""}</span>
            </div>

            {/* Request Update Button */}
            <button
              type="button"
              onClick={() => setShowRequestModal(true)}
              className="w-full mb-4 px-3 py-2 text-sm font-medium border border-white/10 rounded-lg hover:bg-white/10 text-white transition-colors flex items-center justify-center gap-2"
            >
              <Send className="w-3.5 h-3.5" />
              Request Update Now
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
                  <button
                    key={update.id}
                    type="button"
                    onClick={() => setSelectedUpdate(update)}
                    className="w-full border border-white/10 rounded-xl px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors"
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
                    {getStatusBadge(update.status)}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Update Detail Overlay */}
      {selectedUpdate && founderEmail && (
        <InvestorUpdateOverlay
          update={selectedUpdate}
          dealId={dealId}
          dealName={dealName}
          companyName={companyName}
          founderEmail={founderEmail}
          onClose={() => setSelectedUpdate(null)}
          onSent={async () => {
            await fetchUpdates();
            setSelectedUpdate(null);
          }}
        />
      )}

      {/* Request Update Modal */}
      {showRequestModal && founderEmail && (
        <InvestorUpdateRequestModal
          dealId={dealId}
          dealName={dealName}
          companyName={companyName}
          founderEmail={founderEmail}
          onClose={() => setShowRequestModal(false)}
          onSent={async () => {
            await fetchUpdates();
          }}
        />
      )}

      {/* Edit Deal Modal (scrolled to investor updates section) */}
      <EditDealModal
        deal={deal}
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          router.refresh();
        }}
        scrollToSection="investor-updates"
      />
    </div>
  );
}
