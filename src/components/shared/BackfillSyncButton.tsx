"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function BackfillSyncButton() {
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    stats?: {
      totalGmailMessages: number;
      newEmailsIngested: number;
      emailsParsed: number;
      dealsMatched: number;
    };
  } | null>(null);
  const router = useRouter();

  const handleBackfill = async () => {
    const confirmed = confirm(
      "This will fetch ALL emails from your Gmail inbox and parse them with AI. This may take several minutes and use API credits. Continue?"
    );

    if (!confirmed) return;

    setIsBackfilling(true);
    setResult(null);

    try {
      const response = await fetch("/api/emails/backfill", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Backfill failed");
      }

      setResult({
        success: true,
        message: data.message || "Backfill complete",
        stats: data.stats,
      });

      // Refresh the page to show new data
      router.refresh();
    } catch (err: any) {
      setResult({
        success: false,
        message: err.message || "Backfill failed",
      });
    } finally {
      setIsBackfilling(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleBackfill}
        disabled={isBackfilling}
        className="px-4 py-2.5 bg-secondary hover:bg-secondary/80 text-sm font-medium rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50"
        title="Parse ALL emails from inbox with AI"
      >
        <svg
          className={`h-4 w-4 ${isBackfilling ? "animate-spin" : ""}`}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
        </svg>
        {isBackfilling ? "Backfilling..." : "Backfill All Emails"}
      </button>

      {result && (
        <div
          className={`absolute top-full right-0 mt-2 p-4 rounded-xl text-sm w-72 z-50 glass-menu ${
            result.success
              ? "text-[hsl(var(--success))]"
              : "text-destructive"
          }`}
        >
          <div className="flex justify-between items-start">
            <p className="font-medium">{result.message}</p>
            <button
              onClick={() => setResult(null)}
              className="text-muted-foreground hover:text-foreground ml-2 transition-colors"
            >
              ×
            </button>
          </div>
          {result.stats && (
            <ul className="mt-2 text-xs text-muted-foreground space-y-1">
              <li>Gmail messages: {result.stats.totalGmailMessages}</li>
              <li>New emails ingested: {result.stats.newEmailsIngested}</li>
              <li>Emails parsed: {result.stats.emailsParsed}</li>
              <li>Deals matched: {result.stats.dealsMatched}</li>
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
