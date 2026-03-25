"use client";

import { useState, useEffect } from "react";
import { X, ExternalLink, Loader2, Trash2 } from "lucide-react";

interface DealLink {
  id: string;
  link_type: string;
  url: string;
}

interface DealLinksModalProps {
  dealId: string;
  dealName: string;
  isOpen: boolean;
  onClose: () => void;
}

const LINK_TYPE_LABELS: Record<string, string> = {
  data_room: "Data Room",
  deal_folder: "Deal Folder",
};

export function DealLinksModal({ dealId, dealName, isOpen, onClose }: DealLinksModalProps) {
  const [links, setLinks] = useState<DealLink[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) loadLinks();
  }, [isOpen]);

  async function loadLinks() {
    setLoading(true);
    try {
      const res = await fetch(`/api/deals/${dealId}/links`);
      if (res.ok) {
        const data = await res.json();
        setLinks(data.links || []);
      }
    } catch {
      // fail silently
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(linkId: string) {
    setLinks((prev) => prev.filter((l) => l.id !== linkId));
    try {
      await fetch(`/api/deals/${dealId}/links`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkId }),
      });
    } catch {
      loadLinks();
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative glass-card text-foreground rounded-2xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 pb-4 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Deal Links</h2>
            <p className="text-sm text-muted-foreground">{dealName}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-foreground" />
          </button>
        </div>

        <div className="p-6 pt-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : links.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No links added yet. Edit the deal to add links.
            </p>
          ) : (
            <div className="space-y-2">
              {links.map((link) => (
                <div
                  key={link.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {LINK_TYPE_LABELS[link.link_type] || link.link_type}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{link.url}</p>
                  </div>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg hover:bg-secondary transition-colors"
                    title="Open link"
                  >
                    <ExternalLink className="w-4 h-4 text-muted-foreground" />
                  </a>
                  <button
                    onClick={() => handleDelete(link.id)}
                    className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
                    title="Remove link"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
