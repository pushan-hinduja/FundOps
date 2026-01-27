"use client";

import { useState } from "react";
import {
  DealLPRelationshipWithLP,
  WireStatus,
  WIRE_STATUS_LABELS,
  KYC_STATUS_LABELS,
  KYCStatus,
} from "@/lib/supabase/types";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { UpdateAllocationModal } from "./UpdateAllocationModal";

interface LPAllocationCardProps {
  relationship: DealLPRelationshipWithLP;
  onUpdateAllocation: (updates: Partial<DealLPRelationshipWithLP>) => Promise<void>;
}

export function LPAllocationCard({
  relationship,
  onUpdateAllocation,
}: LPAllocationCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  const lpContact = relationship.lp_contacts;

  const handleUpdate = async (updates: Partial<DealLPRelationshipWithLP>) => {
    await onUpdateAllocation(updates);
    setIsModalOpen(false);
  };

  return (
    <>
      <div className="p-4 bg-[hsl(var(--success))]/5 rounded-xl border border-[hsl(var(--success))]/20">
        <div className="flex items-start justify-between mb-3">
          <div>
            <Link
              href={`/lps/${lpContact?.id}`}
              className="font-medium hover:text-muted-foreground transition-colors"
            >
              {lpContact?.name || "Unknown LP"}
            </Link>
            <p className="text-sm text-muted-foreground">
              {lpContact?.firm || lpContact?.email}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {lpContact?.kyc_status && (
              <span
                className={`px-2 py-0.5 text-xs font-medium rounded ${getKYCStatusColor(
                  lpContact.kyc_status
                )}`}
              >
                KYC: {KYC_STATUS_LABELS[lpContact.kyc_status]}
              </span>
            )}
            <span
              className={`px-2 py-0.5 text-xs font-medium rounded ${getWireStatusColor(
                relationship.wire_status
              )}`}
            >
              {WIRE_STATUS_LABELS[relationship.wire_status]}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-3">
          <div>
            <p className="text-xs text-muted-foreground">Reserved</p>
            <p className="font-medium metric-number">
              {formatCurrency(relationship.reserved_amount)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Committed</p>
            <p className="font-medium metric-number">
              {formatCurrency(relationship.committed_amount)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Allocated</p>
            <p className="font-medium metric-number text-[hsl(var(--success))]">
              {formatCurrency(relationship.allocated_amount)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Wired</p>
            <p className="font-medium metric-number">
              {formatCurrency(relationship.wire_amount_received)}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {relationship.latest_response_at && (
              <span>
                Last updated{" "}
                {formatDistanceToNow(new Date(relationship.latest_response_at), {
                  addSuffix: true,
                })}
              </span>
            )}
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-3 py-1.5 text-sm bg-secondary hover:bg-secondary/80 rounded-lg transition-colors"
          >
            Update Allocation
          </button>
        </div>
      </div>

      <UpdateAllocationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        relationship={relationship}
        onUpdate={handleUpdate}
      />
    </>
  );
}
