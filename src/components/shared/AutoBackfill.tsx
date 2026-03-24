"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSyncContext } from "./SyncContext";

const MAX_RETRIES = 3;
const CHUNK_DELAY_MS = 200;

export function AutoBackfill() {
  const { isSyncing, startSync, updateProgress, completeSync, failSync } = useSyncContext();
  const router = useRouter();
  const started = useRef(false);

  useEffect(() => {
    if (started.current || isSyncing) return;
    started.current = true;

    async function runBackfill() {
      startSync("backfill");

      let phase: string = "ingest";
      let cursor: string | undefined = undefined;
      let done: boolean = false;
      let retries: number = 0;

      const cumulativeStats = {
        totalGmailMessages: 0,
        newEmailsIngested: 0,
        emailsParsed: 0,
        dealsMatched: 0,
      };

      updateProgress({
        status: "fetching",
        message: "Syncing your inbox for the first time...",
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
          retries = 0;

          cumulativeStats.totalGmailMessages = Math.max(
            cumulativeStats.totalGmailMessages,
            data.stats.totalGmailMessages || 0
          );
          cumulativeStats.newEmailsIngested += data.stats.newEmailsIngested || 0;
          cumulativeStats.emailsParsed += data.stats.emailsParsed || 0;
          cumulativeStats.dealsMatched += data.stats.dealsMatched || 0;

          if (data.progress) {
            updateProgress({
              status: "processing",
              message: data.progress.message,
              current: data.progress.current,
              total: data.progress.total,
            });
          }

          phase = data.phase;
          cursor = data.cursor || undefined;
          done = data.done;

          if (!done) {
            await new Promise((resolve) => setTimeout(resolve, CHUNK_DELAY_MS));
          }
        } catch (err: unknown) {
          retries++;
          if (retries >= MAX_RETRIES) {
            failSync((err as Error).message || "Initial sync failed after retries");
            return;
          }
          await new Promise((resolve) =>
            setTimeout(resolve, 1000 * Math.pow(2, retries - 1))
          );
          continue;
        }
      }

      completeSync(cumulativeStats);
      router.refresh();
    }

    runBackfill();
  }, [isSyncing, startSync, updateProgress, completeSync, failSync, router]);

  return null;
}
