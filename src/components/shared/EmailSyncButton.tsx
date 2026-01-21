"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function EmailSyncButton() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    stats?: {
      emailsIngested: number;
      emailsParsed: number;
      suggestedContactsAdded: number;
    };
  } | null>(null);
  const router = useRouter();

  const handleSync = async () => {
    setIsSyncing(true);
    setResult(null);

    try {
      const response = await fetch("/api/cron/poll-inbox", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Sync failed");
      }

      setResult({
        success: true,
        message: data.message || "Sync complete",
        stats: data.stats,
      });

      // Refresh the page to show new data
      router.refresh();
    } catch (err: any) {
      setResult({
        success: false,
        message: err.message || "Sync failed",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleSync}
        disabled={isSyncing}
        className="px-3 py-2 bg-muted hover:bg-muted/80 text-sm rounded-lg transition flex items-center gap-2 disabled:opacity-50"
      >
        <svg
          className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        {isSyncing ? "Syncing..." : "Sync Emails"}
      </button>

      {result && (
        <div
          className={`absolute top-full right-0 mt-2 p-3 rounded-lg text-sm w-64 z-50 shadow-lg ${
            result.success
              ? "bg-card text-green-600 border border-green-500"
              : "bg-card text-destructive border border-destructive"
          }`}
        >
          <div className="flex justify-between items-start">
            <p className="font-medium">{result.message}</p>
            <button
              onClick={() => setResult(null)}
              className="text-muted-foreground hover:text-foreground ml-2"
            >
              ×
            </button>
          </div>
          {result.stats && (
            <ul className="mt-1 text-xs text-muted-foreground">
              <li>Emails ingested: {result.stats.emailsIngested}</li>
              <li>Emails parsed: {result.stats.emailsParsed}</li>
              <li>Suggested contacts: {result.stats.suggestedContactsAdded}</li>
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
