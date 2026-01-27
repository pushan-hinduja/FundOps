"use client";

import { useState } from "react";
import { LPWiringInstructions as WiringType } from "@/lib/supabase/types";
import {
  Building2,
  Plus,
  Check,
  X,
  Shield,
  ShieldCheck,
  Star,
  Loader2,
  Trash2,
  Pencil,
  Eye,
  EyeOff,
} from "lucide-react";

interface LPWiringInstructionsProps {
  lpId: string;
  wiringInstructions: WiringType[];
  onAddWiring: (wiring: {
    account_label: string;
    bank_name: string;
    account_name: string;
    account_number: string;
    routing_number?: string;
    swift_code?: string;
    iban?: string;
    bank_address?: string;
    intermediary_bank?: string;
    special_instructions?: string;
    is_primary?: boolean;
  }) => Promise<void>;
  onUpdateWiring: (wiringId: string, updates: Partial<WiringType>) => Promise<void>;
  onDeleteWiring: (wiringId: string) => Promise<void>;
}

export function LPWiringInstructions({
  lpId,
  wiringInstructions,
  onAddWiring,
  onUpdateWiring,
  onDeleteWiring,
}: LPWiringInstructionsProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showFullNumbers, setShowFullNumbers] = useState<Record<string, boolean>>({});

  const [formData, setFormData] = useState({
    account_label: "",
    bank_name: "",
    account_name: "",
    account_number: "",
    routing_number: "",
    swift_code: "",
    iban: "",
    bank_address: "",
    intermediary_bank: "",
    special_instructions: "",
    is_primary: false,
  });

  const resetForm = () => {
    setFormData({
      account_label: "",
      bank_name: "",
      account_name: "",
      account_number: "",
      routing_number: "",
      swift_code: "",
      iban: "",
      bank_address: "",
      intermediary_bank: "",
      special_instructions: "",
      is_primary: false,
    });
  };

  const maskAccountNumber = (num: string) => {
    if (num.length <= 4) return num;
    return "****" + num.slice(-4);
  };

  const handleAdd = async () => {
    if (!formData.account_label || !formData.bank_name || !formData.account_name || !formData.account_number) {
      return;
    }

    setIsSaving(true);
    try {
      await onAddWiring(formData);
      resetForm();
      setIsAdding(false);
    } catch (error) {
      console.error("Failed to add wiring:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartEdit = (wiring: WiringType) => {
    setEditingId(wiring.id);
    setFormData({
      account_label: wiring.account_label,
      bank_name: wiring.bank_name,
      account_name: wiring.account_name,
      account_number: wiring.account_number,
      routing_number: wiring.routing_number || "",
      swift_code: wiring.swift_code || "",
      iban: wiring.iban || "",
      bank_address: wiring.bank_address || "",
      intermediary_bank: wiring.intermediary_bank || "",
      special_instructions: wiring.special_instructions || "",
      is_primary: wiring.is_primary,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;

    setIsSaving(true);
    try {
      await onUpdateWiring(editingId, formData);
      setEditingId(null);
      resetForm();
    } catch (error) {
      console.error("Failed to update wiring:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this wiring instruction?")) return;
    try {
      await onDeleteWiring(id);
    } catch (error) {
      console.error("Failed to delete wiring:", error);
    }
  };

  const handleSetPrimary = async (id: string) => {
    try {
      await onUpdateWiring(id, { is_primary: true });
    } catch (error) {
      console.error("Failed to set primary:", error);
    }
  };

  const handleVerify = async (id: string, verified: boolean) => {
    try {
      await onUpdateWiring(id, { is_verified: verified });
    } catch (error) {
      console.error("Failed to verify:", error);
    }
  };

  const renderForm = () => (
    <div className="p-4 bg-secondary/30 rounded-xl border border-border space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">
            Account Label *
          </label>
          <input
            type="text"
            value={formData.account_label}
            onChange={(e) => setFormData({ ...formData, account_label: e.target.value })}
            placeholder="e.g., Primary Investment Account"
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">
            Bank Name *
          </label>
          <input
            type="text"
            value={formData.bank_name}
            onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
            placeholder="e.g., JPMorgan Chase"
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">
            Account Name *
          </label>
          <input
            type="text"
            value={formData.account_name}
            onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
            placeholder="Name on account"
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">
            Account Number *
          </label>
          <input
            type="text"
            value={formData.account_number}
            onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
            placeholder="Account number"
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">
            Routing Number
          </label>
          <input
            type="text"
            value={formData.routing_number}
            onChange={(e) => setFormData({ ...formData, routing_number: e.target.value })}
            placeholder="US domestic routing"
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">
            SWIFT Code
          </label>
          <input
            type="text"
            value={formData.swift_code}
            onChange={(e) => setFormData({ ...formData, swift_code: e.target.value })}
            placeholder="International wires"
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">IBAN</label>
          <input
            type="text"
            value={formData.iban}
            onChange={(e) => setFormData({ ...formData, iban: e.target.value })}
            placeholder="European accounts"
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">
            Intermediary Bank
          </label>
          <input
            type="text"
            value={formData.intermediary_bank}
            onChange={(e) => setFormData({ ...formData, intermediary_bank: e.target.value })}
            placeholder="For international transfers"
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs text-muted-foreground mb-1">
          Bank Address
        </label>
        <input
          type="text"
          value={formData.bank_address}
          onChange={(e) => setFormData({ ...formData, bank_address: e.target.value })}
          placeholder="Full bank address"
          className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>
      <div>
        <label className="block text-xs text-muted-foreground mb-1">
          Special Instructions
        </label>
        <textarea
          value={formData.special_instructions}
          onChange={(e) => setFormData({ ...formData, special_instructions: e.target.value })}
          placeholder="Any special wiring instructions..."
          rows={2}
          className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="is_primary"
          checked={formData.is_primary}
          onChange={(e) => setFormData({ ...formData, is_primary: e.target.checked })}
          className="rounded border-border"
        />
        <label htmlFor="is_primary" className="text-sm text-muted-foreground">
          Set as primary account
        </label>
      </div>
      <div className="flex gap-2">
        <button
          onClick={editingId ? handleSaveEdit : handleAdd}
          disabled={isSaving || !formData.account_label || !formData.bank_name || !formData.account_name || !formData.account_number}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {editingId ? "Save" : "Add"}
        </button>
        <button
          onClick={() => {
            setIsAdding(false);
            setEditingId(null);
            resetForm();
          }}
          className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );

  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium">Wiring Instructions</h2>
        {!isAdding && !editingId && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Account
          </button>
        )}
      </div>

      {/* Add/Edit Form */}
      {(isAdding || editingId) && <div className="mb-4">{renderForm()}</div>}

      {/* Wiring List */}
      {wiringInstructions.length === 0 && !isAdding ? (
        <div className="text-center py-8 text-muted-foreground">
          <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No wiring instructions added yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {wiringInstructions.map((wiring) => (
            <div
              key={wiring.id}
              className={`p-4 rounded-xl border ${
                wiring.is_primary
                  ? "bg-primary/5 border-primary/20"
                  : "bg-secondary/30 border-border"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{wiring.account_label}</p>
                      {wiring.is_primary && (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 text-xs bg-primary/10 text-primary rounded">
                          <Star className="w-3 h-3" />
                          Primary
                        </span>
                      )}
                      {wiring.is_verified ? (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 text-xs bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] rounded">
                          <ShieldCheck className="w-3 h-3" />
                          Verified
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 text-xs bg-yellow-500/10 text-yellow-600 rounded">
                          <Shield className="w-3 h-3" />
                          Unverified
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{wiring.bank_name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {!wiring.is_primary && (
                    <button
                      onClick={() => handleSetPrimary(wiring.id)}
                      className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors"
                      title="Set as primary"
                    >
                      <Star className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleVerify(wiring.id, !wiring.is_verified)}
                    className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors"
                    title={wiring.is_verified ? "Mark unverified" : "Mark verified"}
                  >
                    {wiring.is_verified ? (
                      <ShieldCheck className="w-4 h-4 text-[hsl(var(--success))]" />
                    ) : (
                      <Shield className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => handleStartEdit(wiring)}
                    className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(wiring.id)}
                    className="p-1.5 text-muted-foreground hover:text-destructive rounded-lg hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Account Name</p>
                  <p className="font-medium">{wiring.account_name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Account Number</p>
                  <div className="flex items-center gap-1">
                    <p className="font-mono">
                      {showFullNumbers[wiring.id]
                        ? wiring.account_number
                        : maskAccountNumber(wiring.account_number)}
                    </p>
                    <button
                      onClick={() =>
                        setShowFullNumbers({
                          ...showFullNumbers,
                          [wiring.id]: !showFullNumbers[wiring.id],
                        })
                      }
                      className="p-1 text-muted-foreground hover:text-foreground"
                    >
                      {showFullNumbers[wiring.id] ? (
                        <EyeOff className="w-3 h-3" />
                      ) : (
                        <Eye className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>
                {wiring.routing_number && (
                  <div>
                    <p className="text-xs text-muted-foreground">Routing Number</p>
                    <p className="font-mono">{wiring.routing_number}</p>
                  </div>
                )}
                {wiring.swift_code && (
                  <div>
                    <p className="text-xs text-muted-foreground">SWIFT Code</p>
                    <p className="font-mono">{wiring.swift_code}</p>
                  </div>
                )}
                {wiring.iban && (
                  <div>
                    <p className="text-xs text-muted-foreground">IBAN</p>
                    <p className="font-mono">{wiring.iban}</p>
                  </div>
                )}
              </div>

              {wiring.special_instructions && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground">Special Instructions</p>
                  <p className="text-sm">{wiring.special_instructions}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
