"use client";

import { useState } from "react";
import { DealLinksModal } from "./DealLinksModal";

interface DealLinksButtonProps {
  dealId: string;
  dealName: string;
}

export function DealLinksButton({ dealId, dealName }: DealLinksButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-secondary hover:bg-secondary/80 rounded-xl transition-colors"
      >
        Deal Links
      </button>

      <DealLinksModal
        dealId={dealId}
        dealName={dealName}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
