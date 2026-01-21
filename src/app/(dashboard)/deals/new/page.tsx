"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewDealPage() {
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [description, setDescription] = useState("");
  const [targetRaise, setTargetRaise] = useState("");
  const [minCheckSize, setMinCheckSize] = useState("");
  const [maxCheckSize, setMaxCheckSize] = useState("");
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

      // Create deal
      const { error: insertError } = await supabase.from("deals").insert({
        organization_id: userData.organization_id,
        name,
        company_name: companyName || null,
        description: description || null,
        target_raise: targetRaise ? parseFloat(targetRaise) : null,
        min_check_size: minCheckSize ? parseFloat(minCheckSize) : null,
        max_check_size: maxCheckSize ? parseFloat(maxCheckSize) : null,
        status: "draft",
      });

      if (insertError) throw insertError;

      router.push("/deals");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to create deal");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <Link href="/deals" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to Deals
        </Link>
        <h1 className="text-2xl font-bold mt-2">New Deal</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 bg-card border border-border rounded-lg p-6">
        {error && (
          <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-1">
            Deal Name *
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-3 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="e.g., Acme Series B SPV"
          />
        </div>

        <div>
          <label htmlFor="companyName" className="block text-sm font-medium mb-1">
            Company Name
          </label>
          <input
            id="companyName"
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="w-full px-3 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="e.g., Acme Corp"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium mb-1">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Brief description of the deal..."
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label htmlFor="targetRaise" className="block text-sm font-medium mb-1">
              Target Raise ($)
            </label>
            <input
              id="targetRaise"
              type="number"
              value={targetRaise}
              onChange={(e) => setTargetRaise(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="5000000"
            />
          </div>

          <div>
            <label htmlFor="minCheckSize" className="block text-sm font-medium mb-1">
              Min Check ($)
            </label>
            <input
              id="minCheckSize"
              type="number"
              value={minCheckSize}
              onChange={(e) => setMinCheckSize(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="50000"
            />
          </div>

          <div>
            <label htmlFor="maxCheckSize" className="block text-sm font-medium mb-1">
              Max Check ($)
            </label>
            <input
              id="maxCheckSize"
              type="number"
              value={maxCheckSize}
              onChange={(e) => setMaxCheckSize(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="500000"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:opacity-90 transition disabled:opacity-50"
          >
            {isLoading ? "Creating..." : "Create Deal"}
          </button>
          <Link
            href="/deals"
            className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted transition"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
