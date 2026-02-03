"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";

type LPFilter = "all" | "interested" | "committed" | "allocated";

interface LPRelationship {
  id: string;
  status: string;
  committed_amount: number | null;
  allocated_amount: number | null;
  wire_amount_received: number | null;
  latest_response_at: string | null;
  first_contact_at: string | null;
  notes: string | null;
  lp_contact_id: string;
  lp_contacts: {
    id: string;
    name: string;
    firm: string | null;
    email: string;
    special_fee_percent: number | null;
    special_carry_percent: number | null;
  } | null;
}

interface DealTerms {
  fee_percent: number | null;
  carry_percent: number | null;
}

interface LPInvolvementSectionProps {
  lpRelationships: LPRelationship[];
  dealId: string;
  dealTerms: DealTerms;
}

function formatCurrency(amount: number | null) {
  if (!amount) return "-";
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}K`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function LPInvolvementSection({ lpRelationships, dealId, dealTerms }: LPInvolvementSectionProps) {
  const [activeFilter, setActiveFilter] = useState<LPFilter>("all");
  const [allocatingLpId, setAllocatingLpId] = useState<string | null>(null);
  const [allocationAmount, setAllocationAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  // Filter LPs: must have interested/committed/allocated status AND a dollar amount
  const eligibleLPs = lpRelationships.filter((lp) => {
    // Must be interested, committed, or allocated
    const hasValidStatus = ["interested", "committed", "allocated"].includes(lp.status);
    // Must have a dollar amount
    const hasAmount = (lp.committed_amount && lp.committed_amount > 0) ||
                      (lp.allocated_amount && lp.allocated_amount > 0);
    return hasValidStatus && hasAmount;
  });

  // Apply filter pills
  const filteredLPs = eligibleLPs.filter((lp) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "interested") return lp.status === "interested";
    if (activeFilter === "committed") return lp.status === "committed";
    if (activeFilter === "allocated") return lp.status === "allocated";
    return true;
  });

  const filters: { key: LPFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "interested", label: "Interested" },
    { key: "committed", label: "Committed" },
    { key: "allocated", label: "Allocated" },
  ];

  const handleAllocate = async (lpRelationshipId: string) => {
    if (!allocationAmount || isNaN(parseFloat(allocationAmount))) {
      alert("Please enter a valid amount");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/deals/${dealId}/allocate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          relationshipId: lpRelationshipId,
          amount: parseFloat(allocationAmount) * 1000, // Convert K to dollars
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to allocate");
      }

      setAllocatingLpId(null);
      setAllocationAmount("");
      router.refresh();
    } catch (error) {
      alert("Failed to allocate LP");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="glass-card rounded-2xl p-6">
      {/* Header with filters */}
      <div className="mb-4">
        <h2 className="text-lg font-medium mb-3">LP Involvement ({filteredLPs.length})</h2>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          {filters.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => setActiveFilter(filter.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeFilter === filter.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary hover:bg-secondary/80 text-foreground"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* LP List */}
      {filteredLPs.length > 0 ? (
        <div className="space-y-3">
          {filteredLPs.map((rel) => (
            <div
              key={rel.id}
              className="flex items-center justify-between p-4 bg-white dark:bg-background rounded-xl border border-border/50"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/lps/${rel.lp_contacts?.id}`}
                    className="font-medium hover:text-muted-foreground transition-colors"
                  >
                    {rel.lp_contacts?.name}
                  </Link>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-lg font-medium ${
                      rel.status === "allocated"
                        ? "bg-secondary text-green-600"
                        : rel.status === "committed"
                        ? "bg-secondary text-blue-600"
                        : "bg-secondary text-amber-600"
                    }`}
                  >
                    {rel.status.charAt(0).toUpperCase() + rel.status.slice(1)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {rel.lp_contacts?.firm || rel.lp_contacts?.email}
                </p>
                {/* Special Deal Terms Indicator - only show for allocated LPs with special terms */}
                {rel.status === "allocated" &&
                  (rel.lp_contacts?.special_fee_percent !== null ||
                    rel.lp_contacts?.special_carry_percent !== null) && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs px-2 py-0.5 rounded-md bg-white dark:bg-background text-muted-foreground border border-border">
                        Special Terms:{" "}
                        {rel.lp_contacts?.special_fee_percent !== null && (
                          <span>Fee {rel.lp_contacts?.special_fee_percent}%</span>
                        )}
                        {rel.lp_contacts?.special_fee_percent !== null && rel.lp_contacts?.special_carry_percent !== null && ", "}
                        {rel.lp_contacts?.special_carry_percent !== null && (
                          <span className="ml-1">Carry {rel.lp_contacts?.special_carry_percent}%</span>
                        )}
                      </span>
                    </div>
                  )}
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="font-medium metric-number text-lg">
                    {rel.status === "allocated"
                      ? formatCurrency(rel.allocated_amount)
                      : rel.committed_amount
                      ? formatCurrency(rel.committed_amount)
                      : "-"}
                  </p>
                  {rel.status !== "allocated" && rel.committed_amount && (
                    <p className="text-xs text-muted-foreground">potential</p>
                  )}
                  {rel.latest_response_at && (
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(rel.latest_response_at), {
                        addSuffix: true,
                      })}
                    </p>
                  )}
                </div>

                {/* Allocate Button */}
                {rel.status !== "allocated" && (
                  <div>
                    {allocatingLpId === rel.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          placeholder="Amount (K)"
                          value={allocationAmount}
                          onChange={(e) => setAllocationAmount(e.target.value)}
                          className="w-24 px-2 py-1 text-sm border border-border rounded-lg bg-background"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleAllocate(rel.id)}
                          disabled={isSubmitting}
                          className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50"
                        >
                          {isSubmitting ? "..." : "Save"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAllocatingLpId(null);
                            setAllocationAmount("");
                          }}
                          className="px-3 py-1 text-sm bg-secondary rounded-lg hover:bg-secondary/80"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setAllocatingLpId(rel.id)}
                        className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90"
                      >
                        Allocate
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">
            {activeFilter === "all"
              ? "No LP involvement recorded yet."
              : `No ${activeFilter} LPs found.`}
          </p>
          {activeFilter === "all" && (
            <p className="text-xs text-muted-foreground mt-2">
              LP relationships are created automatically when emails are parsed and matched to deals.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
