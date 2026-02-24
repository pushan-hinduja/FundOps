"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSyncContext } from "./SyncContext";
import { ConfirmDialog } from "./ConfirmDialog";

const MAX_RETRIES = 3;
const CHUNK_DELAY_MS = 200;

export function BackfillSyncButton() {
  const [showConfirm, setShowConfirm] = useState(false);
  const { isSyncing, startSync, updateProgress, completeSync, failSync } = useSyncContext();
  const router = useRouter();

  const handleBackfill = async () => {
    startSync("backfill");

    let phase: string = "ingest";
    let cursor: string | undefined = undefined;
    let done: boolean = false;
    let retries: number = 0;

    // Cumulative stats across all chunks
    const cumulativeStats = {
      totalGmailMessages: 0,
      newEmailsIngested: 0,
      emailsParsed: 0,
      dealsMatched: 0,
    };

    updateProgress({
      status: "fetching",
      message: "Starting backfill...",
    });

    while (!done) {
      try {
        const response: Response = await fetch("/api/emails/backfill-chunk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phase, cursor }),
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || `HTTP ${response.status}`);
        }

        const data = await response.json();
        retries = 0; // Reset retries on success

        // Accumulate stats from this chunk
        cumulativeStats.totalGmailMessages = Math.max(
          cumulativeStats.totalGmailMessages,
          data.stats.totalGmailMessages || 0
        );
        cumulativeStats.newEmailsIngested += data.stats.newEmailsIngested || 0;
        cumulativeStats.emailsParsed += data.stats.emailsParsed || 0;
        cumulativeStats.dealsMatched += data.stats.dealsMatched || 0;

        // Update progress UI
        if (data.progress) {
          updateProgress({
            status: "processing",
            message: data.progress.message,
            current: data.progress.current,
            total: data.progress.total,
          });
        }

        // Advance to next chunk
        phase = data.phase;
        cursor = data.cursor || undefined;
        done = data.done;

        // Small delay between chunks
        if (!done) {
          await new Promise((resolve) => setTimeout(resolve, CHUNK_DELAY_MS));
        }
      } catch (err: unknown) {
        retries++;
        if (retries >= MAX_RETRIES) {
          failSync((err as Error).message || "Backfill failed after retries");
          return;
        }
        // Exponential backoff: 1s, 2s, 4s
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * Math.pow(2, retries - 1))
        );
        // Retry with same phase/cursor (idempotent)
        continue;
      }
    }

    completeSync(cumulativeStats);
    router.refresh();
  };

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        disabled={isSyncing}
        className="px-4 py-2.5 bg-secondary hover:bg-secondary/80 text-sm font-medium rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        title="Parse ALL emails from inbox with AI"
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
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
        </svg>
        Backfill All Emails
      </button>

      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleBackfill}
        variant="warning"
        title="Backfill All Emails?"
        description={`This will reprocess ALL emails in your inbox with AI parsing. This operation:

• May take several minutes to complete
• Uses AI credits for each email parsed
• Should only be done if there are issues with email processing

Only proceed if you're experiencing problems with email sync or need to re-analyze all emails.`}
        confirmText="Start Backfill"
        cancelText="Cancel"
      />
    </>
  );
}
