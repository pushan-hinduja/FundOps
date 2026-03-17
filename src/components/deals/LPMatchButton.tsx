"use client";

import { useState } from "react";
import { ListChecks } from "lucide-react";
import { LPMatchModal } from "./LPMatchModal";

interface LPMatchButtonProps {
  dealId: string;
  dealName: string;
}

export function LPMatchButton({ dealId, dealName }: LPMatchButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-secondary hover:bg-secondary/80 rounded-xl transition-colors"
        title="Recommended Investors"
      >
        <ListChecks className="w-4 h-4" />
        Match LPs
      </button>

      <LPMatchModal
        dealId={dealId}
        dealName={dealName}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
