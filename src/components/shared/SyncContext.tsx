"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type SyncType = "sync" | "backfill";

export interface SyncProgress {
  type: SyncType;
  status: "pending" | "fetching" | "processing" | "complete" | "error";
  message: string;
  current?: number;
  total?: number;
  stats?: {
    emailsIngested?: number;
    emailsParsed?: number;
    suggestedContactsAdded?: number;
    totalGmailMessages?: number;
    newEmailsIngested?: number;
    dealsMatched?: number;
  };
  error?: string;
}

interface SyncContextType {
  isSyncing: boolean;
  progress: SyncProgress | null;
  startSync: (type: SyncType) => void;
  updateProgress: (progress: Partial<SyncProgress>) => void;
  completeSync: (stats?: SyncProgress["stats"]) => void;
  failSync: (error: string) => void;
  clearSync: () => void;
}

const SyncContext = createContext<SyncContextType | null>(null);

export function SyncProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState<SyncProgress | null>(null);

  const startSync = useCallback((type: SyncType) => {
    setProgress({
      type,
      status: "pending",
      message: type === "backfill" ? "Starting backfill..." : "Starting sync...",
    });
  }, []);

  const updateProgress = useCallback((update: Partial<SyncProgress>) => {
    setProgress((prev) => (prev ? { ...prev, ...update } : null));
  }, []);

  const completeSync = useCallback((stats?: SyncProgress["stats"]) => {
    setProgress((prev) =>
      prev
        ? {
            ...prev,
            status: "complete",
            message: prev.type === "backfill" ? "Backfill complete!" : "Sync complete!",
            stats,
          }
        : null
    );
    // Auto-clear after 5 seconds
    setTimeout(() => {
      setProgress(null);
    }, 5000);
  }, []);

  const failSync = useCallback((error: string) => {
    setProgress((prev) =>
      prev
        ? {
            ...prev,
            status: "error",
            message: "Operation failed",
            error,
          }
        : null
    );
  }, []);

  const clearSync = useCallback(() => {
    setProgress(null);
  }, []);

  return (
    <SyncContext.Provider
      value={{
        isSyncing: progress !== null && progress.status !== "complete" && progress.status !== "error",
        progress,
        startSync,
        updateProgress,
        completeSync,
        failSync,
        clearSync,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
}

export function useSyncContext() {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error("useSyncContext must be used within a SyncProvider");
  }
  return context;
}
