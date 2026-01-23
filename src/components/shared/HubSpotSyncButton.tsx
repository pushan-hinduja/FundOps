"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function HubSpotSyncButton() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const router = useRouter();

  const handleSync = async () => {
    if (!apiKey && !showApiKeyInput) {
      setShowApiKeyInput(true);
      return;
    }

    if (!apiKey) {
      setError("Please enter your HubSpot API key");
      return;
    }

    setIsSyncing(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/sync/hubspot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ apiKey }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to sync HubSpot contacts");
      }

      // Show success message with stats
      const stats = data.stats;
      setSuccess(
        `Synced ${stats.contactsFetched} contacts: ${stats.contactsCreated} created, ${stats.contactsUpdated} updated`
      );

      // Refresh the page to show new contacts
      router.refresh();

      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccess(null);
        setIsSyncing(false);
      }, 5000);
    } catch (err: any) {
      setError(err.message || "Failed to sync HubSpot contacts");
      setIsSyncing(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-2">
      {showApiKeyInput && (
        <div className="flex items-center gap-2 bg-card border border-border rounded-xl p-3 shadow-lg">
          <input
            type="password"
            placeholder="Enter HubSpot API Key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            onKeyDown={(e) => {
              if (e.key === "Enter" && apiKey) {
                handleSync();
              }
            }}
          />
          <button
            onClick={() => {
              setShowApiKeyInput(false);
              setApiKey("");
            }}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      <div className="flex items-center gap-2">
        {error && (
          <div className="text-sm text-destructive bg-destructive/10 px-3 py-1.5 rounded-lg">
            {error}
          </div>
        )}
        {success && (
          <div className="text-sm text-[hsl(var(--success))] bg-[hsl(var(--success))]/10 px-3 py-1.5 rounded-lg">
            {success}
          </div>
        )}
        <button
          onClick={handleSync}
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
      </div>
    </div>
  );
}

