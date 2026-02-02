"use client";

import { useState } from "react";
import {
  LPContact,
  InvestorType,
  AccreditationStatus,
  TaxStatus,
  KYCStatus,
  INVESTOR_TYPE_LABELS,
  ACCREDITATION_STATUS_LABELS,
  TAX_STATUS_LABELS,
  KYC_STATUS_LABELS,
} from "@/lib/supabase/types";
import { Check, Pencil, X, Loader2 } from "lucide-react";

interface LPProfileEditorProps {
  lp: LPContact;
  onUpdate: (updates: Partial<LPContact>) => Promise<void>;
}

export function LPProfileEditor({ lp, onUpdate }: LPProfileEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    investor_type: lp.investor_type,
    accreditation_status: lp.accreditation_status,
    tax_status: lp.tax_status,
    kyc_status: lp.kyc_status,
    special_fee_percent: lp.special_fee_percent,
    special_carry_percent: lp.special_carry_percent,
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdate(formData);
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update profile:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      investor_type: lp.investor_type,
      accreditation_status: lp.accreditation_status,
      tax_status: lp.tax_status,
      kyc_status: lp.kyc_status,
      special_fee_percent: lp.special_fee_percent,
      special_carry_percent: lp.special_carry_percent,
    });
    setIsEditing(false);
  };

  const getKYCStatusColor = (status: KYCStatus) => {
    switch (status) {
      case "approved":
        return "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]";
      case "pending":
      case "in_review":
        return "bg-yellow-500/10 text-yellow-600";
      case "rejected":
      case "expired":
        return "bg-destructive/10 text-destructive";
      default:
        return "bg-secondary text-muted-foreground";
    }
  };

  const investorTypes: (InvestorType | "")[] = [
    "",
    "individual",
    "institution",
    "family_office",
    "fund_of_funds",
    "endowment",
    "pension",
    "sovereign_wealth",
  ];

  const accreditationStatuses: (AccreditationStatus | "")[] = [
    "",
    "accredited_investor",
    "qualified_purchaser",
    "qualified_client",
    "non_accredited",
  ];

  const taxStatuses: (TaxStatus | "")[] = [
    "",
    "us_individual",
    "us_entity",
    "foreign_individual",
    "foreign_entity",
    "tax_exempt",
  ];

  const kycStatuses: KYCStatus[] = [
    "not_started",
    "pending",
    "in_review",
    "approved",
    "expired",
    "rejected",
  ];

  if (!isEditing) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium">Investor Profile</h2>
          <button
            onClick={() => setIsEditing(true)}
            className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors"
          >
            <Pencil className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Investor Type</p>
            <p className="font-medium">
              {lp.investor_type
                ? INVESTOR_TYPE_LABELS[lp.investor_type]
                : "Not set"}
            </p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-1">
              Accreditation Status
            </p>
            <p className="font-medium">
              {lp.accreditation_status
                ? ACCREDITATION_STATUS_LABELS[lp.accreditation_status]
                : "Not set"}
            </p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-1">Tax Status</p>
            <p className="font-medium">
              {lp.tax_status ? TAX_STATUS_LABELS[lp.tax_status] : "Not set"}
            </p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-1">KYC Status</p>
            <span
              className={`inline-block px-2.5 py-1 rounded-lg text-sm font-medium ${getKYCStatusColor(
                lp.kyc_status
              )}`}
            >
              {KYC_STATUS_LABELS[lp.kyc_status]}
            </span>
          </div>
        </div>

        {/* Special Deal Terms */}
        {(lp.special_fee_percent !== null || lp.special_carry_percent !== null) && (
          <div className="mt-6 pt-4 border-t border-border">
            <h3 className="text-sm font-medium mb-3">Special Deal Terms</h3>
            <div className="flex items-center gap-4">
              {lp.special_fee_percent !== null && (
                <span className="text-sm">
                  <span className="text-muted-foreground">Fee:</span>{" "}
                  <span className="font-medium">{lp.special_fee_percent}%</span>
                </span>
              )}
              {lp.special_carry_percent !== null && (
                <span className="text-sm">
                  <span className="text-muted-foreground">Carry:</span>{" "}
                  <span className="font-medium">{lp.special_carry_percent}%</span>
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              These terms override the default deal terms for all deals.
            </p>
          </div>
        )}

        {/* Show placeholder if no special terms set */}
        {lp.special_fee_percent === null && lp.special_carry_percent === null && (
          <div className="mt-6 pt-4 border-t border-border">
            <h3 className="text-sm font-medium mb-2">Special Deal Terms</h3>
            <p className="text-sm text-muted-foreground">
              No special terms set. Default deal terms will apply.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium">Investor Profile</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCancel}
            disabled={isSaving}
            className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="p-2 text-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/10 rounded-lg transition-colors"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-muted-foreground mb-1">
            Investor Type
          </label>
          <select
            value={formData.investor_type || ""}
            onChange={(e) =>
              setFormData({
                ...formData,
                investor_type: (e.target.value || null) as InvestorType | null,
              })
            }
            className="w-full px-3 py-2 border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {investorTypes.map((type) => (
              <option key={type || "empty"} value={type}>
                {type ? INVESTOR_TYPE_LABELS[type] : "Select..."}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-muted-foreground mb-1">
            Accreditation Status
          </label>
          <select
            value={formData.accreditation_status || ""}
            onChange={(e) =>
              setFormData({
                ...formData,
                accreditation_status: (e.target.value ||
                  null) as AccreditationStatus | null,
              })
            }
            className="w-full px-3 py-2 border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {accreditationStatuses.map((status) => (
              <option key={status || "empty"} value={status}>
                {status ? ACCREDITATION_STATUS_LABELS[status] : "Select..."}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-muted-foreground mb-1">
            Tax Status
          </label>
          <select
            value={formData.tax_status || ""}
            onChange={(e) =>
              setFormData({
                ...formData,
                tax_status: (e.target.value || null) as TaxStatus | null,
              })
            }
            className="w-full px-3 py-2 border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {taxStatuses.map((status) => (
              <option key={status || "empty"} value={status}>
                {status ? TAX_STATUS_LABELS[status] : "Select..."}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-muted-foreground mb-1">
            KYC Status
          </label>
          <select
            value={formData.kyc_status}
            onChange={(e) =>
              setFormData({
                ...formData,
                kyc_status: e.target.value as KYCStatus,
              })
            }
            className="w-full px-3 py-2 border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {kycStatuses.map((status) => (
              <option key={status} value={status}>
                {KYC_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Special Deal Terms */}
      <div className="mt-6 pt-4 border-t border-border">
        <h3 className="text-sm font-medium mb-3">Special Deal Terms</h3>
        <p className="text-xs text-muted-foreground mb-3">
          If set, these terms will override the default deal terms for all deals.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-muted-foreground mb-1">
              Special Fee (%)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={formData.special_fee_percent ?? ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  special_fee_percent: e.target.value ? parseFloat(e.target.value) : null,
                })
              }
              placeholder="e.g., 1.5"
              className="w-full px-3 py-2 border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">
              Special Carry (%)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={formData.special_carry_percent ?? ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  special_carry_percent: e.target.value ? parseFloat(e.target.value) : null,
                })
              }
              placeholder="e.g., 15"
              className="w-full px-3 py-2 border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
