"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface BackfillEmailsButtonProps {
  dealId: string;
}

export function BackfillEmailsButton({ dealId }: BackfillEmailsButtonProps) {
  const router = useRouter();
  const [isBackfilling, setIsBackfilling] = useState(false);

  const handleBackfill = async () => {
    if (isBackfilling) return;

    const confirmed = confirm(
      "This will re-parse all unparsed emails with AI to find matches for this deal. This may take a few minutes. Continue?"
    );

    if (!confirmed) return;

    setIsBackfilling(true);

    try {
      const response = await fetch(`/api/deals/${dealId}/emails/backfill`, {
        method: "POST",
      });

      const result = await response.json();

      if (response.ok) {
        alert(
          `Backfill complete!\n\nTotal emails processed: ${result.processed}\nMatched to this deal: ${result.matched}`
        );
        router.refresh(); // Refresh page to show new emails
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (err) {
      alert("Failed to backfill emails");
      console.error(err);
    } finally {
      setIsBackfilling(false);
    }
  };

  return (
    <button
      onClick={handleBackfill}
      disabled={isBackfilling}
      className="text-sm px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {isBackfilling ? "Processing..." : "Backfill & Parse Emails"}
    </button>
  );
}
