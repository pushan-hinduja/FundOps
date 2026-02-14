"use client";

import { useSyncContext } from "./SyncContext";
import { X, Loader2, CheckCircle, AlertCircle, Mail, Archive, RefreshCw } from "lucide-react";

export function SyncToast() {
  const { progress, clearSync } = useSyncContext();

  if (!progress) return null;

  const isComplete = progress.status === "complete";
  const isError = progress.status === "error";
  const isProcessing = progress.status === "processing" || progress.status === "fetching";

  // Calculate progress percentage if we have current/total
  const progressPercent =
    progress.current && progress.total
      ? Math.round((progress.current / progress.total) * 100)
      : null;

  return (
    <div className="fixed bottom-6 left-6 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div
        className={`glass-menu rounded-xl p-4 w-80 shadow-lg overflow-hidden ${
          isError ? "border border-destructive/30" : ""
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Icon */}
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isError
                  ? "bg-destructive/10"
                  : isComplete
                  ? "bg-[hsl(var(--success))]/10"
                  : "bg-primary/10"
              }`}
            >
              {isError ? (
                <AlertCircle className="w-5 h-5 text-destructive" />
              ) : isComplete ? (
                <CheckCircle className="w-5 h-5 text-[hsl(var(--success))]" />
              ) : progress.type === "backfill" ? (
                <Archive className="w-5 h-5 text-primary" />
              ) : progress.type === "hubspot" ? (
                <RefreshCw className={`w-5 h-5 text-primary ${isProcessing ? "animate-spin" : ""}`} />
              ) : (
                <Mail className="w-5 h-5 text-primary" />
              )}
            </div>
            <div>
              <p className="font-medium text-sm">
                {progress.type === "backfill" ? "Email Backfill" : progress.type === "hubspot" ? "HubSpot Sync" : "Email Sync"}
              </p>
              <p
                className={`text-xs ${
                  isError
                    ? "text-destructive"
                    : isComplete
                    ? "text-[hsl(var(--success))]"
                    : "text-muted-foreground"
                }`}
              >
                {progress.message}
              </p>
            </div>
          </div>

          {/* Close button (only show when complete or error) */}
          {(isComplete || isError) && (
            <button
              onClick={clearSync}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Progress bar */}
        {isProcessing && (
          <div className="mt-3">
            {progressPercent !== null ? (
              <>
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                  <span>
                    Processing {progress.current} of {progress.total}
                  </span>
                  <span>{progressPercent}%</span>
                </div>
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Processing emails...</span>
              </div>
            )}
          </div>
        )}

        {/* Stats (show when complete) */}
        {isComplete && progress.stats && (
          <div className="mt-3 pt-3 border-t border-border">
            <ul className="text-xs text-muted-foreground space-y-1">
              {progress.type === "hubspot" ? (
                <>
                  {progress.stats.contactsFetched !== undefined && (
                    <li className="flex justify-between">
                      <span>Contacts fetched</span>
                      <span className="font-medium text-foreground">
                        {progress.stats.contactsFetched}
                      </span>
                    </li>
                  )}
                  {progress.stats.contactsCreated !== undefined && (
                    <li className="flex justify-between">
                      <span>Contacts created</span>
                      <span className="font-medium text-[hsl(var(--success))]">
                        {progress.stats.contactsCreated}
                      </span>
                    </li>
                  )}
                  {progress.stats.contactsUpdated !== undefined && (
                    <li className="flex justify-between">
                      <span>Contacts updated</span>
                      <span className="font-medium text-foreground">
                        {progress.stats.contactsUpdated}
                      </span>
                    </li>
                  )}
                </>
              ) : progress.type === "backfill" ? (
                <>
                  {progress.stats.totalGmailMessages !== undefined && (
                    <li className="flex justify-between">
                      <span>Gmail messages</span>
                      <span className="font-medium text-foreground">
                        {progress.stats.totalGmailMessages}
                      </span>
                    </li>
                  )}
                  {progress.stats.newEmailsIngested !== undefined && (
                    <li className="flex justify-between">
                      <span>New emails ingested</span>
                      <span className="font-medium text-foreground">
                        {progress.stats.newEmailsIngested}
                      </span>
                    </li>
                  )}
                  {progress.stats.emailsParsed !== undefined && (
                    <li className="flex justify-between">
                      <span>Emails parsed</span>
                      <span className="font-medium text-foreground">
                        {progress.stats.emailsParsed}
                      </span>
                    </li>
                  )}
                  {progress.stats.dealsMatched !== undefined && (
                    <li className="flex justify-between">
                      <span>Deals matched</span>
                      <span className="font-medium text-[hsl(var(--success))]">
                        {progress.stats.dealsMatched}
                      </span>
                    </li>
                  )}
                </>
              ) : (
                <>
                  {progress.stats.emailsIngested !== undefined && (
                    <li className="flex justify-between">
                      <span>Emails ingested</span>
                      <span className="font-medium text-foreground">
                        {progress.stats.emailsIngested}
                      </span>
                    </li>
                  )}
                  {progress.stats.emailsParsed !== undefined && (
                    <li className="flex justify-between">
                      <span>Emails parsed</span>
                      <span className="font-medium text-foreground">
                        {progress.stats.emailsParsed}
                      </span>
                    </li>
                  )}
                  {progress.stats.suggestedContactsAdded !== undefined && (
                    <li className="flex justify-between">
                      <span>Suggested contacts</span>
                      <span className="font-medium text-foreground">
                        {progress.stats.suggestedContactsAdded}
                      </span>
                    </li>
                  )}
                </>
              )}
            </ul>
          </div>
        )}

        {/* Error details */}
        {isError && progress.error && (
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-xs text-destructive line-clamp-3 break-words">
              {progress.error.length > 150 ? progress.error.slice(0, 150) + "..." : progress.error}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
