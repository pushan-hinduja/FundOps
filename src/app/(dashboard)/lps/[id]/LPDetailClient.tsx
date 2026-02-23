"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  LPContact,
  DealLPRelationshipWithDeal,
} from "@/lib/supabase/types";
import { LPProfileEditor } from "@/components/lp/LPProfileEditor";
import { LPDealTermsEditor } from "@/components/lp/LPDealTermsEditor";

interface LPDetailClientProps {
  lp: LPContact;
  dealRelationships: DealLPRelationshipWithDeal[];
}

export function LPDetailClient({
  lp,
  dealRelationships: initialRelationships,
}: LPDetailClientProps) {
  const router = useRouter();
  const [dealRelationships, setDealRelationships] = useState(initialRelationships);

  // LP Profile update
  const handleUpdateProfile = async (updates: Partial<LPContact>) => {
    const response = await fetch(`/api/lps/${lp.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error("Failed to update profile");
    }

    router.refresh();
  };

  // Deal terms handler
  const handleUpdateTerms = async (
    relationshipId: string,
    updates: Partial<DealLPRelationshipWithDeal>
  ) => {
    // Find the relationship to get the deal_id
    const relationship = dealRelationships.find((r) => r.id === relationshipId);
    if (!relationship) {
      throw new Error("Relationship not found");
    }

    const response = await fetch(
      `/api/deals/${relationship.deal_id}/allocations`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ relationship_id: relationshipId, ...updates }),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to update terms");
    }

    const updatedRelationship = await response.json();
    setDealRelationships(
      dealRelationships.map((r) =>
        r.id === relationshipId ? { ...r, ...updatedRelationship } : r
      )
    );
  };

  return (
    <>
      <LPProfileEditor lp={lp} onUpdate={handleUpdateProfile} />

      <LPDealTermsEditor
        relationships={dealRelationships}
        onUpdateTerms={handleUpdateTerms}
      />
    </>
  );
}
