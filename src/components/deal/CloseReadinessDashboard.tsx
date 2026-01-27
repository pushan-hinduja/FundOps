"use client";

import { CloseReadinessMetrics } from "@/lib/supabase/types";
import { FileCheck, DollarSign, PieChart, AlertCircle } from "lucide-react";
import Link from "next/link";

interface CloseReadinessDashboardProps {
  metrics: CloseReadinessMetrics;
}

export function CloseReadinessDashboard({ metrics }: CloseReadinessDashboardProps) {
  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}k`;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getProgressColor = (percent: number) => {
    if (percent >= 80) return "bg-[hsl(var(--success))]";
    if (percent >= 50) return "bg-yellow-500";
    return "bg-muted-foreground";
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-6 mb-6">
      <h2 className="text-lg font-medium mb-4">Close Readiness</h2>

      <div className="grid grid-cols-3 gap-6 mb-6">
        {/* Docs Received */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-secondary rounded-lg flex items-center justify-center">
              <FileCheck className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Docs Received</p>
              <p className="text-lg font-semibold">
                {Math.round(metrics.docsReceivedPercent)}%
              </p>
            </div>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${getProgressColor(metrics.docsReceivedPercent)}`}
              style={{ width: `${Math.min(metrics.docsReceivedPercent, 100)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {metrics.lpsWithDocs} of {metrics.totalLPs} LPs
          </p>
        </div>

        {/* Wired */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-secondary rounded-lg flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Wired</p>
              <p className="text-lg font-semibold">
                {Math.round(metrics.wiredPercent)}%
              </p>
            </div>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${getProgressColor(metrics.wiredPercent)}`}
              style={{ width: `${Math.min(metrics.wiredPercent, 100)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {formatCurrency(metrics.totalWired)} of {formatCurrency(metrics.totalAllocated)}
          </p>
        </div>

        {/* Allocated */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-secondary rounded-lg flex items-center justify-center">
              <PieChart className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Allocated</p>
              <p className="text-lg font-semibold">
                {Math.round(metrics.allocatedPercent)}%
              </p>
            </div>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${getProgressColor(metrics.allocatedPercent)}`}
              style={{ width: `${Math.min(metrics.allocatedPercent, 100)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {formatCurrency(metrics.totalAllocated)} of {formatCurrency(metrics.targetRaise)} target
          </p>
        </div>
      </div>

      {/* Pending Items */}
      {metrics.pendingItems.length > 0 && (
        <div className="border-t border-border pt-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-4 h-4 text-yellow-500" />
            <p className="text-sm font-medium">Pending Items ({metrics.pendingItems.length})</p>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {metrics.pendingItems.map((item) => (
              <div
                key={item.lpId}
                className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg text-sm"
              >
                <Link
                  href={`/lps/${item.lpId}`}
                  className="font-medium hover:text-muted-foreground transition-colors"
                >
                  {item.lpName}
                </Link>
                <div className="flex items-center gap-3">
                  <span className="metric-number">
                    {formatCurrency(item.amount)}
                  </span>
                  <div className="flex gap-1.5">
                    {item.missingDocs && (
                      <span className="px-2 py-0.5 text-xs bg-destructive/10 text-destructive rounded">
                        Missing docs
                      </span>
                    )}
                    {item.pendingWire && (
                      <span className="px-2 py-0.5 text-xs bg-yellow-500/10 text-yellow-600 rounded">
                        Pending wire
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
