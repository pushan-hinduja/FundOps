"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ThumbsUp, ThumbsDown, Minus, Archive } from "lucide-react";
import { DealStatusFilter } from "./DealStatusFilter";

interface Deal {
  id: string;
  name: string;
  company_name: string | null;
  status: string;
  target_raise: number | null;
  total_committed: number;
  total_interested: number;
  close_date: string | null;
}

interface DealExtras {
  votesSummary?: { up: number; down: number; sideways: number; total: number; memberCount: number };
  valuation?: number | null;
  roundSize?: number | null;
  lpCount?: number;
  totalAllocated?: number;
  nextUpdateDate?: string | null;
}

interface DealsGridProps {
  deals: Deal[];
  dealExtras: Record<string, DealExtras>;
}

function formatCurrency(amount: number | null | undefined) {
  if (!amount) return "-";
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}k`;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getStatusStyles(status: string) {
  switch (status) {
    case "active":
      return "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]";
    case "draft":
      return "bg-secondary text-muted-foreground";
    case "closed":
      return "bg-foreground/10 text-foreground";
    case "archived":
      return "bg-muted-foreground/10 text-muted-foreground border border-dashed border-muted-foreground/30";
    default:
      return "bg-secondary text-muted-foreground";
  }
}

function DraftCardContent({ deal, extras }: { deal: Deal; extras: DealExtras }) {
  const votes = extras.votesSummary;
  const memberCount = votes?.memberCount || 1;
  const upPct = votes ? (votes.up / memberCount) * 100 : 0;
  const downPct = votes ? (votes.down / memberCount) * 100 : 0;
  const sidewaysPct = votes ? (votes.sideways / memberCount) * 100 : 0;
  const missingPct = 100 - upPct - downPct - sidewaysPct;
  const votedCount = votes?.total || 0;

  return (
    <>
      <div className="space-y-3">
        {/* Round Size */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Round Size</span>
          <span className="font-medium metric-number text-lg">
            {formatCurrency(extras.roundSize)}
          </span>
        </div>

        {/* Valuation */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Valuation</span>
          <span className="font-medium metric-number text-lg">
            {formatCurrency(extras.valuation)}
          </span>
        </div>

        {/* Close date */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Close Date</span>
          <span className="font-medium metric-number text-lg">
            {deal.close_date
              ? new Date(deal.close_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
              : "-"}
          </span>
        </div>
      </div>

      {/* Vote participation bar */}
      <div className="mt-5 pt-4 border-t border-border">
        <div className="flex justify-between items-center text-xs mb-2">
          <span className="text-muted-foreground">Team Votes</span>
          <div className="flex items-center gap-2">
            {votes && votedCount > 0 && (
              <>
                {votes.up > 0 && (
                  <span className="flex items-center gap-0.5 text-green-600">
                    <ThumbsUp className="w-3 h-3" /> {votes.up}
                  </span>
                )}
                {votes.down > 0 && (
                  <span className="flex items-center gap-0.5 text-red-600">
                    <ThumbsDown className="w-3 h-3" /> {votes.down}
                  </span>
                )}
                {votes.sideways > 0 && (
                  <span className="flex items-center gap-0.5 text-yellow-600">
                    <Minus className="w-3 h-3" /> {votes.sideways}
                  </span>
                )}
              </>
            )}
            <span className="font-medium">{votedCount}/{memberCount}</span>
          </div>
        </div>
        <div className="h-1.5 bg-secondary rounded-full overflow-hidden flex">
          {upPct > 0 && (
            <div className="h-full bg-green-500 transition-all" style={{ width: `${upPct}%` }} />
          )}
          {sidewaysPct > 0 && (
            <div className="h-full bg-yellow-400 transition-all" style={{ width: `${sidewaysPct}%` }} />
          )}
          {downPct > 0 && (
            <div className="h-full bg-red-500 transition-all" style={{ width: `${downPct}%` }} />
          )}
          {missingPct > 0 && (
            <div className="h-full bg-secondary transition-all" style={{ width: `${missingPct}%` }} />
          )}
        </div>
      </div>
    </>
  );
}

function ClosedCardContent({ extras }: { extras: DealExtras }) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">Total Allocated</span>
        <span className="font-medium text-[hsl(var(--success))] metric-number text-lg">
          {formatCurrency(extras.totalAllocated)}
        </span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">LPs</span>
        <span className="font-medium metric-number text-lg">
          {extras.lpCount ?? 0}
        </span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">Next Update</span>
        <span className="font-medium metric-number text-lg">
          {extras.nextUpdateDate
            ? new Date(extras.nextUpdateDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
            : "-"}
        </span>
      </div>
    </div>
  );
}

function ActiveCardContent({ deal }: { deal: Deal }) {
  return (
    <>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Target</span>
          <span className="font-medium metric-number text-lg">{formatCurrency(deal.target_raise)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Committed</span>
          <span className="font-medium text-[hsl(var(--success))] metric-number text-lg">
            {formatCurrency(deal.total_committed)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Interested</span>
          <span className="font-medium metric-number text-lg">
            {formatCurrency(deal.total_interested)}
          </span>
        </div>
      </div>

      {deal.target_raise && deal.target_raise > 0 && (
        <div className="mt-5 pt-4 border-t border-border">
          <div className="flex justify-between items-center text-xs mb-2">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">
              {Math.round(((deal.total_committed || 0) / deal.target_raise) * 100)}%
            </span>
          </div>
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-foreground rounded-full transition-all"
              style={{
                width: `${Math.min(100, ((deal.total_committed || 0) / deal.target_raise) * 100)}%`,
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}

export function DealsGrid({ deals, dealExtras }: DealsGridProps) {
  const [filter, setFilter] = useState("all");

  const counts: Record<string, number> = { all: deals.filter((d) => d.status !== "archived").length };
  for (const d of deals) {
    counts[d.status] = (counts[d.status] || 0) + 1;
  }

  const filtered = filter === "all"
    ? deals.filter((d) => d.status !== "archived")
    : deals.filter((d) => d.status === filter);

  return (
    <>
      <div className="mb-6">
        <DealStatusFilter counts={counts} onFilterChange={setFilter} />
      </div>

      {filtered.length === 0 ? (
        <div className="glass-card p-8 rounded-2xl text-center">
          <p className="text-muted-foreground">No {filter === "all" ? "" : filter} deals found.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((deal) => {
            const extras = dealExtras[deal.id] || {};

            return (
              <Link
                key={deal.id}
                href={`/deals/${deal.id}`}
                className={`group glass-card glass-card-hover rounded-2xl p-6 ${deal.status === "archived" ? "opacity-60 hover:opacity-80 border-dashed" : ""}`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-lg truncate">{deal.name}</h3>
                    {deal.company_name && (
                      <p className="text-sm text-muted-foreground truncate">{deal.company_name}</p>
                    )}
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize ${getStatusStyles(deal.status)}`}
                  >
                    {deal.status}
                  </span>
                </div>

                {deal.status === "archived" ? (
                  <div className="text-sm text-muted-foreground/60 italic flex items-center gap-2">
                    <Archive className="w-4 h-4" />
                    This deal has been archived
                  </div>
                ) : deal.status === "draft" ? (
                  <DraftCardContent deal={deal} extras={extras} />
                ) : deal.status === "closed" ? (
                  <ClosedCardContent extras={extras} />
                ) : (
                  <ActiveCardContent deal={deal} />
                )}

                <div className="mt-4 flex items-center justify-end">
                  <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors flex items-center gap-1">
                    View details
                    <ArrowUpRight className="w-3 h-3" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
