"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSyncContext } from "./SyncContext";
import { ConfirmDialog } from "./ConfirmDialog";

export function BackfillSyncButton() {
  const [showConfirm, setShowConfirm] = useState(false);
  const { isSyncing, startSync, updateProgress, completeSync, failSync } = useSyncContext();
  const router = useRouter();

  const handleBackfill = async () => {
    startSync("backfill");

    try {
      // Use SSE endpoint for real-time progress
      const eventSource = new EventSource("/api/emails/backfill-stream");

      eventSource.addEventListener("status", (e) => {
        const data = JSON.parse(e.data);
        updateProgress({
          status: data.status,
          message: data.message,
          total: data.total,
        });
      });

      eventSource.addEventListener("progress", (e) => {
        const data = JSON.parse(e.data);
        updateProgress({
          status: "processing",
          message:
            data.phase === "ingest"
              ? `Ingesting emails (${data.newEmailsIngested} new)...`
              : `Parsing with AI (${data.dealsMatched} deals matched)...`,
          current: data.current,
          total: data.total,
        });
      });

      eventSource.addEventListener("complete", (e) => {
        const data = JSON.parse(e.data);
        eventSource.close();
        completeSync(data.stats);
        router.refresh();
      });

      eventSource.addEventListener("error", (e) => {
        // Check if this is a real error or just the stream closing
        if (eventSource.readyState === EventSource.CLOSED) {
          return;
        }

        try {
          const data = JSON.parse((e as MessageEvent).data);
          failSync(data.message || "Backfill failed");
        } catch {
          failSync("Connection lost. Please try again.");
        }
        eventSource.close();
      });

      // Handle connection errors
      eventSource.onerror = () => {
        if (eventSource.readyState === EventSource.CONNECTING) {
          // Still trying to connect, don't fail yet
          return;
        }
        eventSource.close();
      };
    } catch (err: unknown) {
      const error = err as Error;
      failSync(error.message || "Backfill failed");
    }
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
