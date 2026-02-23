"use client";

import { useState } from "react";
import {
  DealLPRelationshipWithLP,
  WireStatus,
  WIRE_STATUS_LABELS,
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
        return "bg-secondary text-green-600";
      case "partial":
        return "bg-secondary text-yellow-600";
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
      <div className="group relative px-6 py-4 hover:bg-secondary/30 transition-colors">
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
            <span
              className={`px-2 py-0.5 text-xs font-medium rounded-lg ${getWireStatusColor(
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
            <p className="font-medium metric-number">
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
        </div>

        {/* Update Allocation - appears on hover, centered */}
        <div className="absolute inset-0 flex items-center justify-end pr-6 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
          >
            Update
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
