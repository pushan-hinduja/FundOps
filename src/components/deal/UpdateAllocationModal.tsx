"use client";

import { useState } from "react";
import {
  DealLPRelationshipWithLP,
  WireStatus,
  WIRE_STATUS_LABELS,
} from "@/lib/supabase/types";
import { X, Loader2 } from "lucide-react";
import { CurrencyInput } from "@/components/shared/CurrencyInput";

interface UpdateAllocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  relationship: DealLPRelationshipWithLP;
  onUpdate: (updates: Partial<DealLPRelationshipWithLP>) => Promise<void>;
}

export function UpdateAllocationModal({
  isOpen,
  onClose,
  relationship,
  onUpdate,
}: UpdateAllocationModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    reserved_amount: relationship.reserved_amount || "",
    committed_amount: relationship.committed_amount || "",
    allocated_amount: relationship.allocated_amount || "",
    wire_status: relationship.wire_status,
    wire_amount_received: relationship.wire_amount_received || "",
    close_date: relationship.close_date || "",
    notes: relationship.notes || "",
  });

  if (!isOpen) return null;

  const wireStatuses: WireStatus[] = ["pending", "partial", "complete"];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onUpdate({
        reserved_amount: formData.reserved_amount
          ? parseFloat(formData.reserved_amount.toString())
          : null,
        committed_amount: formData.committed_amount
          ? parseFloat(formData.committed_amount.toString())
          : null,
        allocated_amount: formData.allocated_amount
          ? parseFloat(formData.allocated_amount.toString())
          : null,
        wire_status: formData.wire_status,
        wire_amount_received: formData.wire_amount_received
          ? parseFloat(formData.wire_amount_received.toString())
          : null,
        close_date: formData.close_date || null,
        notes: formData.notes || null,
      });
    } catch (error) {
      console.error("Failed to update allocation:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="glass-card rounded-2xl w-full max-w-lg mx-4 shadow-xl">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-lg font-medium">Update Allocation</h2>
            <p className="text-sm text-muted-foreground">
              {relationship.lp_contacts?.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Reserved Amount ($)
              </label>
              <CurrencyInput
                value={formData.reserved_amount}
                onChange={(val) =>
                  setFormData({ ...formData, reserved_amount: val })
                }
                placeholder="Soft commitment"
                className="w-full px-4 py-2.5 border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <p className="text-xs text-muted-foreground mt-1">
                From email indication
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Committed Amount ($)
              </label>
              <CurrencyInput
                value={formData.committed_amount}
                onChange={(val) =>
                  setFormData({ ...formData, committed_amount: val })
                }
                placeholder="Signed commitment"
                className="w-full px-4 py-2.5 border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Formal commitment
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Allocated Amount ($)
              </label>
              <CurrencyInput
                value={formData.allocated_amount}
                onChange={(val) =>
                  setFormData({ ...formData, allocated_amount: val })
                }
                placeholder="Final allocation"
                className="w-full px-4 py-2.5 border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Amount to close
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Wire Amount Received ($)
              </label>
              <CurrencyInput
                value={formData.wire_amount_received}
                onChange={(val) =>
                  setFormData({
                    ...formData,
                    wire_amount_received: val,
                  })
                }
                placeholder="Amount received"
                className="w-full px-4 py-2.5 border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Wire Status
              </label>
              <select
                value={formData.wire_status}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    wire_status: e.target.value as WireStatus,
                  })
                }
                className="w-full px-4 py-2.5 border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {wireStatuses.map((status) => (
                  <option key={status} value={status}>
                    {WIRE_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Close Date
              </label>
              <input
                type="date"
                value={formData.close_date}
                onChange={(e) =>
                  setFormData({ ...formData, close_date: e.target.value })
                }
                className="w-full px-4 py-2.5 border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              rows={3}
              placeholder="Any notes about this allocation..."
              className="w-full px-4 py-2.5 border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-secondary text-foreground rounded-xl font-medium hover:bg-secondary/80 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
