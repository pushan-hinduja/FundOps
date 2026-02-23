"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CloseReadinessMetrics,
  DealLPRelationshipWithLP,
} from "@/lib/supabase/types";
import { CloseReadinessDashboard } from "@/components/deal/CloseReadinessDashboard";
import { LPAllocationCard } from "@/components/deal/LPAllocationCard";

interface DealDetailClientProps {
  dealId: string;
  dealStatus: string;
  closeReadinessMetrics: CloseReadinessMetrics;
  committedRelationships: DealLPRelationshipWithLP[];
  hideCloseReadiness?: boolean;
}

export function DealDetailClient({
  dealId,
  dealStatus,
  closeReadinessMetrics,
  committedRelationships: initialRelationships,
  hideCloseReadiness = false,
}: DealDetailClientProps) {
  const router = useRouter();
  const [relationships, setRelationships] = useState(initialRelationships);
  const [metrics, setMetrics] = useState(closeReadinessMetrics);

  const handleUpdateAllocation = async (
    relationshipId: string,
    updates: Partial<DealLPRelationshipWithLP>
  ) => {
    const response = await fetch(`/api/deals/${dealId}/allocations`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ relationship_id: relationshipId, ...updates }),
    });

    if (!response.ok) {
      throw new Error("Failed to update allocation");
    }

    const updatedRelationship = await response.json();

    // Update local state
    setRelationships(
      relationships.map((r) =>
        r.id === relationshipId ? { ...r, ...updatedRelationship } : r
      )
    );

    // Recalculate metrics
    const updatedRelationships = relationships.map((r) =>
      r.id === relationshipId ? { ...r, ...updatedRelationship } : r
    );

    const totalAllocated = updatedRelationships.reduce(
      (sum, r) => sum + (r.allocated_amount || 0),
      0
    );
    const totalWired = updatedRelationships.reduce(
      (sum, r) => sum + (r.wire_amount_received || 0),
      0
    );

    setMetrics({
      ...metrics,
      totalAllocated,
      totalWired,
      wiredPercent: totalAllocated > 0 ? (totalWired / totalAllocated) * 100 : 0,
      allocatedPercent:
        metrics.targetRaise > 0 ? (totalAllocated / metrics.targetRaise) * 100 : 0,
    });

    // Refresh page to update deal totals
    router.refresh();
  };

  const allocatedCard = (
    <div className="w-1/2 h-[32rem] glass-card rounded-2xl overflow-hidden flex flex-col">
      <div className="px-6 py-4 border-b border-border shrink-0">
        <h2 className="text-lg font-medium">
          Allocated ({relationships.length})
        </h2>
      </div>
      <div className="divide-y divide-border overflow-y-auto flex-1">
        {relationships.map((rel) => (
          <LPAllocationCard
            key={rel.id}
            relationship={rel}
            onUpdateAllocation={(updates) =>
              handleUpdateAllocation(rel.id, updates)
            }
          />
        ))}
      </div>
    </div>
  );

  if (hideCloseReadiness) {
    return allocatedCard;
  }

  return (
    <div className="flex gap-6 mb-6">
      {/* Close Readiness Dashboard */}
      <div className="w-1/2 h-[32rem]">
        <CloseReadinessDashboard metrics={metrics} dealId={dealId} dealStatus={dealStatus} />
      </div>

      {/* Allocated LPs with allocation tracking */}
      {allocatedCard}
    </div>
  );
}
