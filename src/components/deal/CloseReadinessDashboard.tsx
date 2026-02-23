"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CloseReadinessMetrics } from "@/lib/supabase/types";
import { AlertCircle, CheckCircle2, Check } from "lucide-react";
import Link from "next/link";

interface CloseReadinessDashboardProps {
  metrics: CloseReadinessMetrics;
  dealId: string;
  dealStatus: string;
}

function DonutChart({
  percent,
  label,
  detail,
  size = 120,
  strokeWidth = 8,
}: {
  percent: number;
  label: string;
  detail: string;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedPercent = Math.min(Math.max(percent, 0), 100);
  const offset = circumference - (clampedPercent / 100) * circumference;

  const getColor = (pct: number) => {
    if (pct >= 80) return "#4ade80"; // bright green
    if (pct >= 50) return "#facc15"; // bright yellow
    return "#e5e7eb"; // light gray
  };

  const color = getColor(clampedPercent);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth={strokeWidth}
          />
          {/* Progress arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-semibold" style={{ color }}>
            {Math.round(clampedPercent)}%
          </span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-xs font-medium text-white/90">{label}</p>
        <p className="text-[10px] text-white/60 mt-0.5">{detail}</p>
      </div>
    </div>
  );
}

export function CloseReadinessDashboard({ metrics, dealId, dealStatus }: CloseReadinessDashboardProps) {
  const router = useRouter();
  const [isClosing, setIsClosing] = useState(false);

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}k`;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleCloseDeal = async () => {
    if (!confirm("Are you sure you want to close this deal?")) return;
    setIsClosing(true);
    try {
      const res = await fetch(`/api/deals/${dealId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "closed" }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        alert("Failed to close deal");
      }
    } catch {
      alert("Failed to close deal");
    } finally {
      setIsClosing(false);
    }
  };

  return (
    <div className="glass-card-readiness rounded-2xl p-6 h-full overflow-hidden flex flex-col">
      <div className="flex items-center justify-between mb-6 shrink-0">
        <h2 className="text-lg font-medium text-white">Close Readiness</h2>
        {dealStatus === "active" && (
          <button
            type="button"
            onClick={handleCloseDeal}
            disabled={isClosing}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors disabled:opacity-50"
          >
            {isClosing ? "Closing..." : <><Check className="w-4 h-4" /> Close Deal</>}
          </button>
        )}
      </div>

      <div className="flex items-start justify-around mb-6 shrink-0">
        <DonutChart
          percent={metrics.wiredPercent}
          label="Wired"
          detail={`${formatCurrency(metrics.totalWired)} of ${formatCurrency(metrics.totalAllocated)}`}
        />
        <DonutChart
          percent={metrics.allocatedPercent}
          label="Allocated"
          detail={`${formatCurrency(metrics.totalAllocated)} of ${formatCurrency(metrics.targetRaise)}`}
        />
      </div>

      {/* Pending Items */}
      <div className="border-t border-white/10 pt-4 flex flex-col min-h-0 flex-1">
        {metrics.pendingItems.length > 0 ? (
          <>
            <div className="flex items-center gap-2 mb-3 shrink-0">
              <AlertCircle className="w-4 h-4 text-yellow-400" />
              <p className="text-sm font-medium text-white">Pending Items ({metrics.pendingItems.length})</p>
            </div>
            <div className="space-y-2 overflow-y-auto flex-1">
              {metrics.pendingItems.map((item) => (
                <div
                  key={item.lpId}
                  className="flex items-center justify-between p-3 bg-white/5 rounded-lg text-sm"
                >
                  <Link
                    href={`/lps/${item.lpId}`}
                    className="font-medium text-white hover:text-white/80 transition-colors"
                  >
                    {item.lpName}
                  </Link>
                  <div className="flex items-center gap-3">
                    <span className="metric-number text-white">
                      {formatCurrency(item.amount)}
                    </span>
                    <div className="flex gap-1.5">
                      {item.pendingWire && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-yellow-500/20 text-yellow-400 rounded-lg">
                          Pending wire
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center flex-1 gap-2">
            <CheckCircle2 className="w-8 h-8 text-green-400/60" />
            <p className="text-sm font-medium text-white/50">No pending actions</p>
          </div>
        )}
      </div>
    </div>
  );
}
