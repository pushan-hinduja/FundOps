"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CurrencyInput } from "@/components/shared/CurrencyInput";

export default function NewDealPage() {
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [description, setDescription] = useState("");
  const [targetRaise, setTargetRaise] = useState("");
  const [minCheckSize, setMinCheckSize] = useState("");
  const [maxCheckSize, setMaxCheckSize] = useState("");
  const [feePercent, setFeePercent] = useState("");
  const [carryPercent, setCarryPercent] = useState("");
  const [memoUrl, setMemoUrl] = useState("");
  const [createdDate, setCreatedDate] = useState("");
  const [closeDate, setCloseDate] = useState("");
  const [investmentStage, setInvestmentStage] = useState("");
  const [investmentType, setInvestmentType] = useState("");
  const [founderEmail, setFounderEmail] = useState("");
  const [investorUpdateFrequency, setInvestorUpdateFrequency] = useState("");
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
        fee_percent: feePercent ? parseFloat(feePercent) : null,
        carry_percent: carryPercent ? parseFloat(carryPercent) : null,
        memo_url: memoUrl || null,
        created_date: createdDate || null,
        close_date: closeDate || null,
        investment_stage: investmentStage || null,
        investment_type: investmentType || null,
        founder_email: founderEmail || null,
        investor_update_frequency: investorUpdateFrequency || null,
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
    <div className="px-8 py-6">
      <div className="mb-8">
        <Link href="/deals" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Deals
        </Link>
        <h1 className="text-3xl font-medium tracking-tight mt-4">New Deal</h1>
        <p className="text-muted-foreground mt-1">Create a new fundraising deal</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 glass-card rounded-2xl p-8">
        {error && (
          <div className="bg-destructive/10 text-destructive p-4 rounded-xl text-sm">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-2">
            Deal Name *
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-4 py-3 border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            placeholder="e.g., Acme Series B SPV"
          />
        </div>

        <div>
          <label htmlFor="companyName" className="block text-sm font-medium mb-2">
            Company Name
          </label>
          <input
            id="companyName"
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="w-full px-4 py-3 border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            placeholder="e.g., Acme Corp"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium mb-2">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
            placeholder="Brief description of the deal..."
          />
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="createdDate" className="block text-sm font-medium mb-2">
              Created Date
            </label>
            <input
              id="createdDate"
              type="date"
              value={createdDate}
              onChange={(e) => setCreatedDate(e.target.value)}
              className="w-full px-4 py-3 border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
          <div>
            <label htmlFor="closeDate" className="block text-sm font-medium mb-2">
              Close Date
            </label>
            <input
              id="closeDate"
              type="date"
              value={closeDate}
              onChange={(e) => setCloseDate(e.target.value)}
              className="w-full px-4 py-3 border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
        </div>

        {/* Investment Info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="investmentStage" className="block text-sm font-medium mb-2">
              Investment Stage
            </label>
            <input
              id="investmentStage"
              type="text"
              value={investmentStage}
              onChange={(e) => setInvestmentStage(e.target.value)}
              className="w-full px-4 py-3 border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              placeholder="e.g., Series B"
            />
          </div>
          <div>
            <label htmlFor="investmentType" className="block text-sm font-medium mb-2">
              Investment Type
            </label>
            <input
              id="investmentType"
              type="text"
              value={investmentType}
              onChange={(e) => setInvestmentType(e.target.value)}
              className="w-full px-4 py-3 border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              placeholder="e.g., Equity"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label htmlFor="targetRaise" className="block text-sm font-medium mb-2">
              Target Raise ($)
            </label>
            <CurrencyInput
              id="targetRaise"
              value={targetRaise}
              onChange={(val) => setTargetRaise(val)}
              className="w-full px-4 py-3 border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              placeholder="5,000,000"
            />
          </div>

          <div>
            <label htmlFor="minCheckSize" className="block text-sm font-medium mb-2">
              Min Check ($)
            </label>
            <CurrencyInput
              id="minCheckSize"
              value={minCheckSize}
              onChange={(val) => setMinCheckSize(val)}
              className="w-full px-4 py-3 border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              placeholder="50,000"
            />
          </div>

          <div>
            <label htmlFor="maxCheckSize" className="block text-sm font-medium mb-2">
              Max Check ($)
            </label>
            <CurrencyInput
              id="maxCheckSize"
              value={maxCheckSize}
              onChange={(val) => setMaxCheckSize(val)}
              className="w-full px-4 py-3 border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              placeholder="500,000"
            />
          </div>
        </div>

        {/* Deal Terms */}
        <div className="border-t border-border pt-6 mt-6">
          <h3 className="text-sm font-medium mb-4">Deal Terms</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="feePercent" className="block text-sm font-medium mb-2">
                Management Fee (%)
              </label>
              <input
                id="feePercent"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={feePercent}
                onChange={(e) => setFeePercent(e.target.value)}
                className="w-full px-4 py-3 border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                placeholder="e.g., 2"
              />
            </div>
            <div>
              <label htmlFor="carryPercent" className="block text-sm font-medium mb-2">
                Carry (%)
              </label>
              <input
                id="carryPercent"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={carryPercent}
                onChange={(e) => setCarryPercent(e.target.value)}
                className="w-full px-4 py-3 border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                placeholder="e.g., 20"
              />
            </div>
          </div>
        </div>

        {/* Investor Updates */}
        <div className="border-t border-border pt-6 mt-6">
          <h3 className="text-sm font-medium mb-4">Investor Updates</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="founderEmail" className="block text-sm font-medium mb-2">
                Founder/Company Email
              </label>
              <input
                id="founderEmail"
                type="email"
                value={founderEmail}
                onChange={(e) => setFounderEmail(e.target.value)}
                className="w-full px-4 py-3 border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                placeholder="founder@company.com"
              />
            </div>
            <div>
              <label htmlFor="investorUpdateFrequency" className="block text-sm font-medium mb-2">
                Update Frequency
              </label>
              <select
                id="investorUpdateFrequency"
                value={investorUpdateFrequency}
                onChange={(e) => setInvestorUpdateFrequency(e.target.value)}
                className="w-full px-4 py-3 border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              >
                <option value="">Not set</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="semi_annual">Semi-Annual</option>
                <option value="annual">Annual</option>
              </select>
            </div>
          </div>
        </div>

        {/* Memo URL */}
        <div>
          <label htmlFor="memoUrl" className="block text-sm font-medium mb-2">
            Memo URL
          </label>
          <input
            id="memoUrl"
            type="url"
            value={memoUrl}
            onChange={(e) => setMemoUrl(e.target.value)}
            className="w-full px-4 py-3 border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            placeholder="https://..."
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isLoading ? "Creating..." : "Create Deal"}
          </button>
          <Link
            href="/deals"
            className="px-6 py-3 bg-secondary text-foreground rounded-xl text-sm font-medium hover:bg-secondary/80 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
