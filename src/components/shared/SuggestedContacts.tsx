"use client";

import { useState, useEffect } from "react";
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

  useEffect(() => {
    // Auto-refresh every 5 minutes
    const interval = setInterval(() => {
      fetchContacts();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [organizationId]);

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
      // Error handling in server components will prevent RSC payload failures
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

  return (
    <div className="h-full bg-card border-r border-border flex flex-col">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h2 className="text-lg font-semibold">Suggested Contacts</h2>
        <button
          onClick={() => fetchContacts(true)}
          disabled={isRefreshing}
          className="p-1.5 hover:bg-muted rounded transition disabled:opacity-50"
          title="Refresh"
        >
          <svg
            className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
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
      </div>

      <div className="flex-1 overflow-y-auto">
        {error && (
          <div className="p-4 text-sm text-destructive bg-destructive/10 m-2 rounded">
            {error}
          </div>
        )}

        {contacts.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No suggested contacts found
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                className="p-3 bg-muted/50 rounded-lg border border-border hover:bg-muted transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{contact.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{contact.email}</p>
                    {contact.firm && (
                      <p className="text-xs text-muted-foreground truncate">{contact.firm}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleAdd(contact.id)}
                      className="p-1.5 hover:bg-primary/10 rounded transition text-primary"
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
                      className="p-1.5 hover:bg-destructive/10 rounded transition text-destructive"
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

