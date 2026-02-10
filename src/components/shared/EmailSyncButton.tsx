"use client";

import { useRouter } from "next/navigation";
import { useSyncContext } from "./SyncContext";

export function EmailSyncButton() {
  const { isSyncing, startSync, updateProgress, completeSync, failSync } = useSyncContext();
  const router = useRouter();

  const handleSync = async () => {
    startSync("sync");
    updateProgress({ status: "fetching", message: "Fetching unread emails..." });

    try {
      const response = await fetch("/api/cron/poll-inbox", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Sync failed");
      }

      completeSync({
        emailsIngested: data.stats?.emailsIngested || 0,
        emailsParsed: data.stats?.emailsParsed || 0,
        suggestedContactsAdded: data.stats?.suggestedContactsAdded || 0,
      });

      // Refresh the page to show new data
      router.refresh();
    } catch (err: unknown) {
      const error = err as Error;
      failSync(error.message || "Sync failed");
    }
  };

  return (
    <button
      onClick={handleSync}
      disabled={isSyncing}
      className="px-4 py-2.5 bg-secondary hover:bg-secondary/80 text-sm font-medium rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      title="Sync only unread emails from inbox"
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
      {isSyncing ? "Syncing..." : "Sync Unread"}
    </button>
  );
}
