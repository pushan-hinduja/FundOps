"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewOrganizationPage() {
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create organization
      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .insert({
          name,
          domain: domain || null,
        })
        .select()
        .single();

      if (orgError) throw orgError;

      // Update user with organization_id
      const { error: userError } = await supabase
        .from("users")
        .update({
          organization_id: org.id,
          role: "admin", // Creator becomes admin
        })
        .eq("id", user.id);

      if (userError) throw userError;

      router.push("/settings");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to create organization");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-lg">
      <div className="mb-6">
        <Link href="/settings" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to Settings
        </Link>
        <h1 className="text-2xl font-bold mt-2">Create Organization</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 bg-card border border-border rounded-lg p-6">
        {error && (
          <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-1">
            Organization Name *
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-3 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="My VC Firm"
          />
        </div>

        <div>
          <label htmlFor="domain" className="block text-sm font-medium mb-1">
            Domain (optional)
          </label>
          <input
            id="domain"
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            className="w-full px-3 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="myvcfirm.com"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Used to identify emails from your team members
          </p>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:opacity-90 transition disabled:opacity-50"
          >
            {isLoading ? "Creating..." : "Create Organization"}
          </button>
          <Link
            href="/settings"
            className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted transition"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
