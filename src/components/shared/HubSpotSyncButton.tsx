"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSyncContext } from "./SyncContext";

export function HubSpotSyncButton() {
  const [showPopup, setShowPopup] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const popupRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { isSyncing, startSync, updateProgress, completeSync, failSync } = useSyncContext();

  // Close popup when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setShowPopup(false);
      }
    }
    if (showPopup) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showPopup]);

  const handleSync = async () => {
    if (!apiKey) return;

    setShowPopup(false);
    startSync("hubspot");
    updateProgress({ status: "fetching", message: "Fetching contacts from HubSpot..." });

    try {
      const response = await fetch("/api/sync/hubspot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to sync HubSpot contacts");
      }

      completeSync({
        contactsFetched: data.stats.contactsFetched,
        contactsCreated: data.stats.contactsCreated,
        contactsUpdated: data.stats.contactsUpdated,
      });

      router.refresh();
    } catch (err: any) {
      failSync(err.message || "Failed to sync HubSpot contacts");
    }
  };

  return (
    <div className="relative" ref={popupRef}>
      <button
        onClick={() => setShowPopup(!showPopup)}
        disabled={isSyncing}
        className="px-4 py-2.5 bg-secondary text-foreground rounded-xl text-sm font-medium hover:bg-secondary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
      >
        {isSyncing ? (
          <>
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Syncing...
          </>
        ) : (
          <>
            <svg
              className="h-4 w-4"
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
            Sync HubSpot
          </>
        )}
      </button>

      {/* Popup */}
      {showPopup && (
        <div className="absolute right-0 top-full mt-2 glass-menu rounded-xl p-4 w-80 z-50 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <p className="text-sm font-medium mb-3">HubSpot API Key</p>
          <input
            type="password"
            placeholder="Enter your API key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && apiKey) handleSync();
            }}
            autoFocus
            className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all mb-3"
          />
          <button
            onClick={handleSync}
            disabled={!apiKey}
            className="w-full px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            Fetch Contacts
          </button>
        </div>
      )}
    </div>
  );
}
