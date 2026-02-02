"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

interface Deal {
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
}

interface EditDealModalProps {
  deal: Deal;
  isOpen: boolean;
  onClose: () => void;
}

export function EditDealModal({ deal, isOpen, onClose }: EditDealModalProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: deal.name,
    company_name: deal.company_name || "",
    description: deal.description || "",
    target_raise: deal.target_raise ? (deal.target_raise / 1000).toString() : "",
    min_check_size: deal.min_check_size ? (deal.min_check_size / 1000).toString() : "",
    max_check_size: deal.max_check_size ? (deal.max_check_size / 1000).toString() : "",
    fee_percent: deal.fee_percent?.toString() || "",
    carry_percent: deal.carry_percent?.toString() || "",
    status: deal.status,
    memo_url: deal.memo_url || "",
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/deals/${deal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          company_name: formData.company_name || null,
          description: formData.description || null,
          target_raise: formData.target_raise ? parseFloat(formData.target_raise) * 1000 : null,
          min_check_size: formData.min_check_size ? parseFloat(formData.min_check_size) * 1000 : null,
          max_check_size: formData.max_check_size ? parseFloat(formData.max_check_size) * 1000 : null,
          fee_percent: formData.fee_percent ? parseFloat(formData.fee_percent) : null,
          carry_percent: formData.carry_percent ? parseFloat(formData.carry_percent) : null,
          status: formData.status,
          memo_url: formData.memo_url || null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update deal");
      }

      router.refresh();
      onClose();
    } catch (error) {
      alert("Failed to update deal");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-card border border-border rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-medium">Edit Deal</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Deal Name */}
          <div>
            <label className="block text-sm font-medium mb-1">Deal Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background"
            />
          </div>

          {/* Company Name */}
          <div>
            <label className="block text-sm font-medium mb-1">Company Name</label>
            <input
              type="text"
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background resize-none"
            />
          </div>

          {/* Target Raise */}
          <div>
            <label className="block text-sm font-medium mb-1">Target Raise (K)</label>
            <input
              type="number"
              step="0.1"
              value={formData.target_raise}
              onChange={(e) => setFormData({ ...formData, target_raise: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              placeholder="e.g., 5000 for $5M"
            />
          </div>

          {/* Check Size Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Min Check (K)</label>
              <input
                type="number"
                step="0.1"
                value={formData.min_check_size}
                onChange={(e) => setFormData({ ...formData, min_check_size: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Max Check (K)</label>
              <input
                type="number"
                step="0.1"
                value={formData.max_check_size}
                onChange={(e) => setFormData({ ...formData, max_check_size: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              />
            </div>
          </div>

          {/* Deal Terms */}
          <div className="border-t border-border pt-4 mt-4">
            <h3 className="text-sm font-medium mb-3">Deal Terms</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Management Fee (%)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.fee_percent}
                  onChange={(e) => setFormData({ ...formData, fee_percent: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  placeholder="e.g., 2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Carry (%)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.carry_percent}
                  onChange={(e) => setFormData({ ...formData, carry_percent: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  placeholder="e.g., 20"
                />
              </div>
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background"
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="closed">Closed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Memo URL */}
          <div>
            <label className="block text-sm font-medium mb-1">Memo URL</label>
            <input
              type="url"
              value={formData.memo_url}
              onChange={(e) => setFormData({ ...formData, memo_url: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              placeholder="https://..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
