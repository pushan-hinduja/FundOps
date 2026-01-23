"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface SuggestedContact {
  id: string;
  email: string;
  name: string;
  firm: string | null;
  title: string | null;
}

export function SuggestedContacts({
  organizationId,
  initialContacts = []
}: {
  organizationId: string;
  initialContacts?: SuggestedContact[];
}) {
  const [contacts, setContacts] = useState<SuggestedContact[]>(initialContacts);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const fetchContacts = async () => {
    setIsRefreshing(true);
    setError(null);

    try {
      const response = await fetch("/api/suggested-contacts");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch suggested contacts");
      }

      setContacts(data.contacts || []);
    } catch (err: any) {
      setError(err.message || "Failed to load suggested contacts");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleAdd = async (contactId: string) => {
    try {
      const response = await fetch("/api/suggested-contacts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ contactId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to add contact");
      }

      // Remove from list
      setContacts((prev) => prev.filter((c) => c.id !== contactId));

      // Refresh the page to show new LP in the table
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to add contact");
    }
  };

  const handleDismiss = async (contactId: string) => {
    try {
      const response = await fetch(`/api/suggested-contacts?id=${contactId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to dismiss contact");
      }

      // Remove from list
      setContacts((prev) => prev.filter((c) => c.id !== contactId));
    } catch (err: any) {
      setError(err.message || "Failed to dismiss contact");
    }
  };

  if (isHidden) {
    return (
      <button
        onClick={() => setIsHidden(false)}
        className="h-full w-12 bg-card border-l border-t border-border flex items-center justify-center hover:bg-secondary transition-colors"
        title="Show Suggested Contacts"
      >
        <svg
          className="h-4 w-4 rotate-180 text-muted-foreground"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </button>
    );
  }

  return (
    <div className="h-full w-80 bg-card border-l border-t border-border flex flex-col">
      <div className="p-5 border-b border-border flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-medium">Suggested</h2>
          <p className="text-xs text-muted-foreground">{contacts.length} contacts</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => fetchContacts()}
            disabled={isRefreshing}
            className="p-2 hover:bg-secondary rounded-lg transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <svg
              className={`h-4 w-4 text-muted-foreground ${isRefreshing ? "animate-spin" : ""}`}
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
          </button>
          <button
            onClick={() => setIsHidden(true)}
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
            title="Hide panel"
          >
            <svg
              className="h-4 w-4 text-muted-foreground"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {error && (
          <div className="p-4 text-sm text-destructive bg-destructive/10 m-3 rounded-xl">
            {error}
          </div>
        )}

        {contacts.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            No suggested contacts found
          </div>
        ) : (
          <div className="p-3 space-y-2">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                className="p-4 bg-secondary/30 rounded-xl border border-border hover:bg-secondary/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{contact.name}</p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{contact.email}</p>
                    {contact.firm && (
                      <p className="text-xs text-muted-foreground truncate">{contact.firm}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleAdd(contact.id)}
                      className="p-2 hover:bg-[hsl(var(--success))]/10 rounded-lg transition-colors text-[hsl(var(--success))]"
                      title="Add to LP contacts"
                    >
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
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDismiss(contact.id)}
                      className="p-2 hover:bg-destructive/10 rounded-lg transition-colors text-muted-foreground hover:text-destructive"
                      title="Dismiss"
                    >
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
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
