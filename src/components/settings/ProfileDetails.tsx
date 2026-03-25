"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

interface ProfileDetailsProps {
  name: string;
  email: string;
}

export function ProfileDetails({ name: initialName, email: initialEmail }: ProfileDetailsProps) {
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [savedName, setSavedName] = useState(initialName);
  const [savedEmail, setSavedEmail] = useState(initialEmail);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const hasChanges = name !== savedName || email !== savedEmail;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSavedName(name.trim());
      setSavedEmail(email.trim());
      setSuccess("Profile updated");
      window.dispatchEvent(new CustomEvent("profile-updated", {
        detail: { name: name.trim(), email: email.trim() },
      }));
    } catch (err: any) {
      setError(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave}>
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

      <div className="space-y-4">
        <div className="flex items-center justify-between py-3 border-b border-border">
          <label htmlFor="profile-name" className="text-sm text-muted-foreground">Name</label>
          <input
            id="profile-name"
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setSuccess(null); }}
            className="px-3 py-2 border border-input rounded-lg bg-background text-sm font-medium text-right focus:outline-none focus:ring-2 focus:ring-ring w-64"
          />
        </div>
        <div className="flex items-center justify-between py-3 border-b border-border">
          <label htmlFor="profile-email" className="text-sm text-muted-foreground">Email</label>
          <input
            id="profile-email"
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setSuccess(null); }}
            className="px-3 py-2 border border-input rounded-lg bg-background text-sm font-medium text-right focus:outline-none focus:ring-2 focus:ring-ring w-64"
          />
        </div>
      </div>

      <div className="pt-4">
        <button
          type="submit"
          disabled={saving || !name.trim() || !email.trim() || !hasChanges}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          Save Changes
        </button>
      </div>
    </form>
  );
}
