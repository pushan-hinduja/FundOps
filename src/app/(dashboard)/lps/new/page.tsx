"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewLPPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [firm, setFirm] = useState("");
  const [title, setTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [preferredCheckSize, setPreferredCheckSize] = useState("");
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Get current user's organization
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: userData } = await supabase
        .from("users")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      if (!userData?.organization_id) {
        throw new Error("No organization found");
      }

      // Create LP
      const { error: insertError } = await supabase.from("lp_contacts").insert({
        organization_id: userData.organization_id,
        name,
        email,
        firm: firm || null,
        title: title || null,
        phone: phone || null,
        preferred_check_size: preferredCheckSize ? parseInt(preferredCheckSize) : null,
        notes: notes || null,
      });

      if (insertError) throw insertError;

      router.push("/lps");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to create LP");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <Link href="/lps" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to LPs
        </Link>
        <h1 className="text-2xl font-bold mt-2">Add LP Contact</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 bg-card border border-border rounded-lg p-6">
        {error && (
          <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1">
              Name *
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="John Smith"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              Email *
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="john@example.com"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="firm" className="block text-sm font-medium mb-1">
              Firm
            </label>
            <input
              id="firm"
              type="text"
              value={firm}
              onChange={(e) => setFirm(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Smith Family Office"
            />
          </div>

          <div>
            <label htmlFor="title" className="block text-sm font-medium mb-1">
              Title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Managing Partner"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="phone" className="block text-sm font-medium mb-1">
              Phone
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="+1 (555) 123-4567"
            />
          </div>

          <div>
            <label htmlFor="preferredCheckSize" className="block text-sm font-medium mb-1">
              Preferred Check Size ($)
            </label>
            <input
              id="preferredCheckSize"
              type="number"
              value={preferredCheckSize}
              onChange={(e) => setPreferredCheckSize(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="250000"
            />
          </div>
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium mb-1">
            Notes
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Any relevant notes about this LP..."
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:opacity-90 transition disabled:opacity-50"
          >
            {isLoading ? "Creating..." : "Add LP"}
          </button>
          <Link
            href="/lps"
            className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted transition"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
