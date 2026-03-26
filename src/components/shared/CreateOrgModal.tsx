"use client";

import { useState, useEffect } from "react";
import { X, Plus, Trash2, Loader2 } from "lucide-react";

interface PendingMember {
  email: string;
}

interface CreateOrgModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateOrgModal({ isOpen, onClose, onCreated }: CreateOrgModalProps) {
  const [orgName, setOrgName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [members, setMembers] = useState<PendingMember[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [memberError, setMemberError] = useState<string | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setOrgName("");
      setMemberEmail("");
      setMembers([]);
      setCreating(false);
      setError(null);
      setMemberError(null);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !creating) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, creating, onClose]);

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    setMemberError(null);

    const email = memberEmail.trim().toLowerCase();
    if (!email) return;

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setMemberError("Please enter a valid email address");
      return;
    }

    // Check for duplicates
    if (members.some((m) => m.email === email)) {
      setMemberError("This email has already been added");
      return;
    }

    setMembers((prev) => [...prev, { email }]);
    setMemberEmail("");
  };

  const handleRemoveMember = (email: string) => {
    setMembers((prev) => prev.filter((m) => m.email !== email));
  };

  const handleCreate = async () => {
    if (!orgName.trim()) {
      setError("Organization name is required");
      return;
    }

    setCreating(true);
    setError(null);

    try {
      // Step 1: Create the organization
      const orgRes = await fetch("/api/user/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: orgName.trim() }),
      });
      const orgData = await orgRes.json();
      if (!orgRes.ok) throw new Error(orgData.error || "Failed to create organization");

      // Step 2: Add/invite each member (org is now active, user is admin)
      const memberErrors: string[] = [];
      for (const member of members) {
        try {
          const res = await fetch("/api/organization/members", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: member.email }),
          });
          if (!res.ok) {
            const data = await res.json();
            memberErrors.push(`${member.email}: ${data.error}`);
          }
        } catch {
          memberErrors.push(`${member.email}: Failed to send invite`);
        }
      }

      if (memberErrors.length > 0) {
        console.warn("[CreateOrg] Some members could not be added:", memberErrors);
      }

      onCreated();
    } catch (err: any) {
      setError(err.message || "Failed to create organization");
      setCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-xl animate-in zoom-in-95 fade-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4">
          <h2 className="text-lg font-medium">New Organization</h2>
          <button
            onClick={onClose}
            disabled={creating}
            className="p-1 hover:bg-secondary rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 pb-2 space-y-4">
          {error && (
            <div className="p-3 rounded-xl text-sm bg-destructive/10 text-destructive">
              {error}
            </div>
          )}

          {/* Org name */}
          <div>
            <label htmlFor="new-org-name" className="block text-sm font-medium mb-1.5">
              Organization Name
            </label>
            <input
              id="new-org-name"
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              disabled={creating}
              className="w-full px-3 py-2 border border-input rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
              placeholder="My VC Firm"
              autoFocus
            />
          </div>

          {/* Members section */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Members
            </label>

            {/* Member list */}
            {members.length > 0 && (
              <div className="space-y-0 mb-3">
                {members.map((member) => (
                  <div
                    key={member.email}
                    className="flex items-center justify-between py-2 border-b border-border"
                  >
                    <span className="text-sm text-muted-foreground">{member.email}</span>
                    <button
                      onClick={() => handleRemoveMember(member.email)}
                      disabled={creating}
                      className="p-1 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive disabled:opacity-50 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {memberError && (
              <div className="text-xs text-destructive mb-2">{memberError}</div>
            )}

            {/* Add member input */}
            <form onSubmit={handleAddMember} className="flex gap-2">
              <input
                type="email"
                value={memberEmail}
                onChange={(e) => {
                  setMemberEmail(e.target.value);
                  setMemberError(null);
                }}
                disabled={creating}
                className="flex-1 px-3 py-2 border border-input rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                placeholder="Add member by email..."
              />
              <button
                type="submit"
                disabled={creating || !memberEmail.trim()}
                className="inline-flex items-center gap-1 px-3 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </form>
            <p className="text-xs text-muted-foreground mt-1.5">
              Existing users will be added directly. New users will receive an invite email.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 mt-2 border-t border-border bg-secondary/30 rounded-b-2xl">
          <button
            onClick={onClose}
            disabled={creating}
            className="px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={creating || !orgName.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-all disabled:opacity-50"
          >
            {creating && <Loader2 className="w-4 h-4 animate-spin" />}
            {creating ? "Creating..." : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
