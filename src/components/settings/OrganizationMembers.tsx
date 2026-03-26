"use client";

import { useState, useEffect, useCallback } from "react";
import { Trash2, Plus, Loader2, Mail } from "lucide-react";

interface Member {
  id: string;
  name: string | null;
  email: string;
  role: string;
}

interface PendingInvite {
  id: string;
  email: string;
  role: string;
  created_at: string;
}

export function OrganizationMembers() {
  const [members, setMembers] = useState<Member[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [cancelingInviteId, setCancelingInviteId] = useState<string | null>(null);
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch("/api/organization/members");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMembers(data.members);
      setPendingInvites(data.pendingInvites || []);
      setCurrentUserId(data.currentUserId);
    } catch (err: any) {
      setError(err.message || "Failed to load members");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setAdding(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/organization/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (data.member) {
        // User existed and was added directly
        setMembers((prev) => [...prev, data.member]);
        setSuccess(`${data.member.email} added to organization`);
      } else if (data.invite) {
        // User didn't exist — invite was sent
        setPendingInvites((prev) => [...prev, data.invite]);
        setSuccess(`Invite sent to ${data.invite.email}`);
      }
      setEmail("");
    } catch (err: any) {
      setError(err.message || "Failed to add member");
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (userId: string) => {
    setRemovingId(userId);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/organization/members", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMembers((prev) => prev.filter((m) => m.id !== userId));
      setSuccess("Member removed from organization");
    } catch (err: any) {
      setError(err.message || "Failed to remove member");
    } finally {
      setRemovingId(null);
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    setCancelingInviteId(inviteId);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/organization/members", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setPendingInvites((prev) => prev.filter((i) => i.id !== inviteId));
      setSuccess("Invite canceled");
    } catch (err: any) {
      setError(err.message || "Failed to cancel invite");
    } finally {
      setCancelingInviteId(null);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    setUpdatingRoleId(userId);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/organization/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMembers((prev) =>
        prev.map((m) => (m.id === userId ? { ...m, role: newRole } : m))
      );
      setSuccess("Role updated");
    } catch (err: any) {
      setError(err.message || "Failed to update role");
    } finally {
      setUpdatingRoleId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

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

      {/* Members list */}
      <div className="space-y-0">
        {members.map((member) => (
          <div
            key={member.id}
            className="group flex items-center justify-between py-3 border-b border-border"
          >
            <div className="flex items-center gap-3">
              <div>
                <p className="font-medium text-sm">
                  {member.name || member.email}
                  {member.id === currentUserId && (
                    <span className="text-muted-foreground ml-1">(you)</span>
                  )}
                </p>
                {member.name && (
                  <p className="text-xs text-muted-foreground">{member.email}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {member.id === currentUserId ? (
                <span className="px-2.5 py-1 rounded-lg text-xs font-medium capitalize bg-secondary">
                  {member.role}
                </span>
              ) : (
                <select
                  value={member.role}
                  onChange={(e) => handleRoleChange(member.id, e.target.value)}
                  disabled={updatingRoleId === member.id}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium capitalize bg-secondary border-none focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer disabled:opacity-50"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              )}
              {member.id !== currentUserId && (
                <button
                  onClick={() => handleRemove(member.id)}
                  disabled={removingId === member.id}
                  className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive disabled:opacity-50 transition-colors"
                >
                  {removingId === member.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Pending invites */}
        {pendingInvites.map((invite) => (
          <div
            key={invite.id}
            className="group flex items-center justify-between py-3 border-b border-border"
          >
            <div className="flex items-center gap-3">
              <div>
                <p className="font-medium text-sm text-muted-foreground">
                  {invite.email}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Mail className="w-3 h-3 text-amber-500" />
                  <span className="text-xs text-amber-600 dark:text-amber-400">Invite sent</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg text-xs font-medium capitalize bg-secondary text-muted-foreground">
                {invite.role}
              </span>
              <button
                onClick={() => handleCancelInvite(invite.id)}
                disabled={cancelingInviteId === invite.id}
                className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive disabled:opacity-50 transition-colors"
              >
                {cancelingInviteId === invite.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add member form */}
      <form onSubmit={handleAdd} className="flex gap-2 mt-4">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Add member by email..."
          className="flex-1 px-3 py-2 border border-input rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          disabled={adding || !email.trim()}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {adding ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          Add
        </button>
      </form>
    </div>
  );
}
