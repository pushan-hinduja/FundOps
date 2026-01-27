"use client";

import { useState } from "react";
import {
  DealLPRelationshipWithDeal,
  ReportingFrequency,
  REPORTING_FREQUENCY_LABELS,
  WIRE_STATUS_LABELS,
  WireStatus,
} from "@/lib/supabase/types";
import { formatDistanceToNow } from "date-fns";
import {
  ChevronDown,
  ChevronRight,
  Check,
  X,
  Loader2,
  Pencil,
} from "lucide-react";
import Link from "next/link";

interface LPDealTermsEditorProps {
  relationships: DealLPRelationshipWithDeal[];
  onUpdateTerms: (relationshipId: string, updates: Partial<DealLPRelationshipWithDeal>) => Promise<void>;
}

export function LPDealTermsEditor({
  relationships,
  onUpdateTerms,
}: LPDealTermsEditorProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<{
    management_fee_percent: number | null;
    carry_percent: number | null;
    minimum_commitment: number | null;
    side_letter_terms: string;
    has_mfn_rights: boolean;
    has_coinvest_rights: boolean;
    reporting_frequency: ReportingFrequency | null;
  }>({
    management_fee_percent: null,
    carry_percent: null,
    minimum_commitment: null,
    side_letter_terms: "",
    has_mfn_rights: false,
    has_coinvest_rights: false,
    reporting_frequency: null,
  });

  const formatCurrency = (amount: number | null) => {
    if (!amount) return "-";
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}k`;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "committed":
      case "allocated":
        return "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]";
      case "interested":
        return "bg-foreground/10 text-foreground";
      case "contacted":
        return "bg-secondary text-muted-foreground";
      case "declined":
        return "bg-destructive/10 text-destructive";
      default:
        return "bg-secondary text-muted-foreground";
    }
  };

  const getWireStatusColor = (status: WireStatus) => {
    switch (status) {
      case "complete":
        return "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]";
      case "partial":
        return "bg-yellow-500/10 text-yellow-600";
      default:
        return "bg-secondary text-muted-foreground";
    }
  };

  const handleStartEdit = (rel: DealLPRelationshipWithDeal) => {
    setEditingId(rel.id);
    setFormData({
      management_fee_percent: rel.management_fee_percent,
      carry_percent: rel.carry_percent,
      minimum_commitment: rel.minimum_commitment,
      side_letter_terms: rel.side_letter_terms || "",
      has_mfn_rights: rel.has_mfn_rights,
      has_coinvest_rights: rel.has_coinvest_rights,
      reporting_frequency: rel.reporting_frequency,
    });
  };

  const handleSave = async () => {
    if (!editingId) return;

    setIsSaving(true);
    try {
      await onUpdateTerms(editingId, formData);
      setEditingId(null);
    } catch (error) {
      console.error("Failed to update terms:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const reportingFrequencies: (ReportingFrequency | "")[] = [
    "",
    "monthly",
    "quarterly",
    "annual",
  ];

  if (relationships.length === 0) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6">
        <h2 className="text-lg font-medium mb-4">Deal History</h2>
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">No deal participation yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <h2 className="text-lg font-medium mb-4">Deal History</h2>

      <div className="space-y-3">
        {relationships.map((rel) => (
          <div
            key={rel.id}
            className="border border-border rounded-xl overflow-hidden"
          >
            {/* Header - always visible */}
            <div
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-secondary/30 transition-colors"
              onClick={() =>
                setExpandedId(expandedId === rel.id ? null : rel.id)
              }
            >
              <div className="flex items-center gap-3">
                {expandedId === rel.id ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
                <div>
                  <Link
                    href={`/deals/${rel.deal_id}`}
                    className="font-medium hover:text-muted-foreground transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {rel.deals?.name || "Unknown Deal"}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {rel.deals?.company_name}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize ${getStatusColor(
                    rel.status
                  )}`}
                >
                  {rel.status}
                </span>
                {(rel.committed_amount || rel.allocated_amount) && (
                  <span className="font-medium metric-number">
                    {formatCurrency(rel.allocated_amount || rel.committed_amount)}
                  </span>
                )}
              </div>
            </div>

            {/* Expanded details */}
            {expandedId === rel.id && (
              <div className="border-t border-border p-4 bg-secondary/20">
                {editingId === rel.id ? (
                  // Edit form
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">
                          Management Fee %
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.management_fee_percent || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              management_fee_percent: e.target.value
                                ? parseFloat(e.target.value)
                                : null,
                            })
                          }
                          placeholder="e.g., 2.0"
                          className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">
                          Carry %
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.carry_percent || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              carry_percent: e.target.value
                                ? parseFloat(e.target.value)
                                : null,
                            })
                          }
                          placeholder="e.g., 20.0"
                          className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">
                          Minimum Commitment
                        </label>
                        <input
                          type="number"
                          value={formData.minimum_commitment || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              minimum_commitment: e.target.value
                                ? parseFloat(e.target.value)
                                : null,
                            })
                          }
                          placeholder="e.g., 100000"
                          className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">
                          Reporting Frequency
                        </label>
                        <select
                          value={formData.reporting_frequency || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              reporting_frequency: (e.target.value ||
                                null) as ReportingFrequency | null,
                            })
                          }
                          className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                        >
                          {reportingFrequencies.map((freq) => (
                            <option key={freq || "empty"} value={freq}>
                              {freq
                                ? REPORTING_FREQUENCY_LABELS[freq]
                                : "Select..."}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center gap-4 col-span-2">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={formData.has_mfn_rights}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                has_mfn_rights: e.target.checked,
                              })
                            }
                            className="rounded border-border"
                          />
                          <span className="text-sm">MFN Rights</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={formData.has_coinvest_rights}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                has_coinvest_rights: e.target.checked,
                              })
                            }
                            className="rounded border-border"
                          />
                          <span className="text-sm">Co-Invest Rights</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">
                        Side Letter Terms
                      </label>
                      <textarea
                        value={formData.side_letter_terms}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            side_letter_terms: e.target.value,
                          })
                        }
                        rows={2}
                        placeholder="Any special terms negotiated..."
                        className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
                      >
                        {isSaving ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  // View mode
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div className="grid grid-cols-4 gap-4 flex-1">
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Committed
                          </p>
                          <p className="font-medium">
                            {formatCurrency(rel.committed_amount)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Allocated
                          </p>
                          <p className="font-medium">
                            {formatCurrency(rel.allocated_amount)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Wire Status
                          </p>
                          <span
                            className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${getWireStatusColor(
                              rel.wire_status
                            )}`}
                          >
                            {WIRE_STATUS_LABELS[rel.wire_status]}
                          </span>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Wire Received
                          </p>
                          <p className="font-medium">
                            {formatCurrency(rel.wire_amount_received)}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleStartEdit(rel)}
                        className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Management Fee
                        </p>
                        <p className="font-medium">
                          {rel.management_fee_percent
                            ? `${rel.management_fee_percent}%`
                            : "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Carry</p>
                        <p className="font-medium">
                          {rel.carry_percent ? `${rel.carry_percent}%` : "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Min Commitment
                        </p>
                        <p className="font-medium">
                          {formatCurrency(rel.minimum_commitment)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Reporting
                        </p>
                        <p className="font-medium">
                          {rel.reporting_frequency
                            ? REPORTING_FREQUENCY_LABELS[rel.reporting_frequency]
                            : "-"}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4 mb-4">
                      {rel.has_mfn_rights && (
                        <span className="px-2 py-1 text-xs bg-secondary rounded font-medium">
                          MFN Rights
                        </span>
                      )}
                      {rel.has_coinvest_rights && (
                        <span className="px-2 py-1 text-xs bg-secondary rounded font-medium">
                          Co-Invest Rights
                        </span>
                      )}
                    </div>

                    {rel.side_letter_terms && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">
                          Side Letter Terms
                        </p>
                        <p className="text-sm">{rel.side_letter_terms}</p>
                      </div>
                    )}

                    {rel.latest_response_at && (
                      <p className="text-xs text-muted-foreground mt-4">
                        Last activity{" "}
                        {formatDistanceToNow(new Date(rel.latest_response_at), {
                          addSuffix: true,
                        })}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
