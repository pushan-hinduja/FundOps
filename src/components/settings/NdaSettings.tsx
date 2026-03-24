"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

interface NdaSettingsProps {
  initialEnabled: boolean;
}

export function NdaSettings({ initialEnabled }: NdaSettingsProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleToggle = async () => {
    const newValue = !enabled;
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/organization/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ require_nda: newValue }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setEnabled(newValue);
      setSuccess(newValue ? "NDA requirement enabled" : "NDA requirement disabled");
    } catch (err: any) {
      setError(err.message || "Failed to update setting");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {error && (
        <div className="bg-destructive/10 text-destructive text-sm px-4 py-2.5 rounded-lg mb-4">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 text-green-800 text-sm px-4 py-2.5 rounded-lg mb-4 dark:bg-green-950/30 dark:text-green-400">
          {success}
        </div>
      )}

      <div className="flex items-center justify-between py-3">
        <div>
          <p className="text-sm font-medium">Require NDA for Deals</p>
          <p className="text-sm text-muted-foreground mt-0.5">
            When enabled, team members must accept an NDA before viewing deal details. You can upload an NDA document per deal.
          </p>
        </div>
        <button
          onClick={handleToggle}
          disabled={saving}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            enabled ? "bg-primary" : "bg-secondary"
          } ${saving ? "opacity-50" : ""}`}
        >
          {saving ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin absolute left-1/2 -translate-x-1/2 text-muted-foreground" />
          ) : (
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                enabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          )}
        </button>
      </div>
    </div>
  );
}
