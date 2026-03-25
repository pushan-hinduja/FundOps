"use client";

import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { LPMatchModal } from "./LPMatchModal";

interface LPRelationshipSummary {
  id: string;
  status: string;
  committed_amount: number | null;
  lp_contacts: {
    id: string;
    name: string;
    firm: string | null;
    email: string;
  } | null;
}

interface LPsInvolvedCardProps {
  count: number;
  dealId: string;
  dealName: string;
  lpRelationships: LPRelationshipSummary[];
  showMatchLPs: boolean;
}

export function LPsInvolvedCard({ count, dealId, dealName, lpRelationships, showMatchLPs }: LPsInvolvedCardProps) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div
        className="bg-card rounded-2xl p-6 border border-border cursor-pointer hover:border-primary/30 transition-colors"
        onClick={() => setModalOpen(true)}
      >
        <div className="flex items-center justify-between mb-2">
          <p className="section-label">LPs Involved</p>
          <button className="p-1 hover:bg-secondary rounded transition-colors">
            <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <p className="metric-number text-3xl">{count}</p>
      </div>

      <LPMatchModal
        dealId={dealId}
        dealName={dealName}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        lpRelationships={lpRelationships}
        showRecommended={showMatchLPs}
      />
    </>
  );
}
