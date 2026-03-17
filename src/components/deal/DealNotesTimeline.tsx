"use client";

import { useState, useEffect } from "react";
import { Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Note {
  id: string;
  content: string;
  created_at: string;
  users: { id: string; name: string | null; email: string } | null;
}

interface DealNotesTimelineProps {
  dealId: string;
  readOnly?: boolean;
}

export function DealNotesTimeline({ dealId, readOnly = false }: DealNotesTimelineProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadNotes();
  }, [dealId]);

  async function loadNotes() {
    const res = await fetch(`/api/deals/${dealId}/notes`);
    if (res.ok) {
      const data = await res.json();
      setNotes(data.notes || []);
    }
  }

  async function addNote() {
    if (!newNote.trim() || submitting || readOnly) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/deals/${dealId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newNote.trim() }),
      });
      if (res.ok) {
        setNewNote("");
        await loadNotes();
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="glass-card rounded-2xl p-6">
      <h2 className="text-lg font-medium mb-3">Team Notes</h2>

      {/* Add note input */}
      {!readOnly && (
        <div className="flex gap-2 mb-5">
          <input
            type="text"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addNote(); }}
            placeholder="Add a note..."
            className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-sm"
          />
          <button
            onClick={addNote}
            disabled={!newNote.trim() || submitting}
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 transition-opacity flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Timeline */}
      {notes.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">No notes yet</p>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />

          <div className="space-y-4">
            {notes.map((note) => {
              const authorName = note.users?.name || note.users?.email || "Unknown";
              const initial = (note.users?.name || note.users?.email || "?")[0].toUpperCase();
              let timeAgo: string;
              try {
                timeAgo = formatDistanceToNow(new Date(note.created_at), { addSuffix: true });
              } catch {
                timeAgo = "";
              }

              return (
                <div key={note.id} className="flex gap-3 relative">
                  {/* Avatar dot */}
                  <div className="w-6 h-6 rounded-full bg-secondary border-2 border-card flex items-center justify-center flex-shrink-0 z-10">
                    <span className="text-[9px] font-semibold text-muted-foreground">{initial}</span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 -mt-0.5">
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <span className="text-xs font-medium text-foreground">{authorName}</span>
                      <span className="text-[10px] text-muted-foreground">{timeAgo}</span>
                    </div>
                    <p className="text-sm text-foreground/80">{note.content}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
