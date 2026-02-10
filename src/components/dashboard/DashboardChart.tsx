"use client";

import { useState, useMemo } from "react";
import { Deal } from "@/lib/supabase/types";

type Timeframe = "week" | "month" | "quarter" | "year";

interface DashboardChartProps {
  deals: Deal[];
  organizationName: string;
  totalCommitted: number;
  totalInterested: number;
  totalTarget: number;
}

interface WeekData {
  weekStart: Date;
  weekEnd: Date;
  label: string;
  committed: number;
  interested: number;
  target: number;
}

// Get the range of weeks to highlight based on timeframe
const getSelectedRange = (timeframe: Timeframe): { start: number; end: number } => {
  // Returns indices for the 52-week array (0 = oldest, 51 = most recent)
  switch (timeframe) {
    case "week":
      return { start: 51, end: 51 }; // Just the current week
    case "month":
      return { start: 48, end: 51 }; // Last 4 weeks
    case "quarter":
      return { start: 39, end: 51 }; // Last 13 weeks
    case "year":
      return { start: 0, end: 51 }; // All 52 weeks
  }
};

const generateSampleData = (): WeekData[] => {
  const now = new Date();
  const weeks: WeekData[] = [];

  for (let i = 51; i >= 0; i--) {
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - i * 7);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    // Generate varied sample data
    const baseCommitted = 50000 + Math.random() * 150000;
    const baseInterested = baseCommitted * (1 + Math.random() * 0.5);
    const baseTarget = 100000 + Math.sin((51 - i) / 8) * 30000 + Math.random() * 20000;

    weeks.push({
      weekStart,
      weekEnd,
      label: getWeekLabel(weekStart),
      committed: Math.round(baseCommitted),
      interested: Math.round(baseInterested),
      target: Math.round(baseTarget),
    });
  }

  return weeks;
};

const getWeekLabel = (date: Date): string => {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[date.getMonth()]} ${date.getDate()}`;
};

const getMonthLabels = (): { label: string; position: number }[] => {
  const now = new Date();
  const labels: { label: string; position: number }[] = [];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  // Go through each week and mark month boundaries
  for (let i = 0; i < 52; i++) {
    const weekDate = new Date(now);
    weekDate.setDate(weekDate.getDate() - (51 - i) * 7);

    // Check if this is the first week of the month or first week overall
    const prevWeekDate = new Date(weekDate);
    prevWeekDate.setDate(prevWeekDate.getDate() - 7);

    if (i === 0 || weekDate.getMonth() !== prevWeekDate.getMonth()) {
      labels.push({
        label: months[weekDate.getMonth()],
        position: i,
      });
    }
  }

  return labels;
};

const groupDealsByWeek = (deals: Deal[]): WeekData[] => {
  const now = new Date();
  const weeks: WeekData[] = [];

  // Create 52 weeks of data
  for (let i = 51; i >= 0; i--) {
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - i * 7);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    weeks.push({
      weekStart,
      weekEnd,
      label: getWeekLabel(weekStart),
      committed: 0,
      interested: 0,
      target: 0,
    });
  }

  // Group deals into weeks based on created_at
  deals.forEach(deal => {
    const dealDate = new Date(deal.created_at);

    for (let i = 0; i < weeks.length; i++) {
      if (dealDate >= weeks[i].weekStart && dealDate <= weeks[i].weekEnd) {
        weeks[i].committed += deal.total_committed || 0;
        weeks[i].interested += deal.total_interested || 0;
        weeks[i].target += deal.target_raise || 0;
        break;
      }
    }
  });

  // If no targets were assigned, distribute total target evenly
  const hasAnyTarget = weeks.some(w => w.target > 0);
  if (!hasAnyTarget) {
    const totalTarget = deals.reduce((sum, d) => sum + (d.target_raise || 0), 0);
    const perWeekTarget = totalTarget / 52;
    weeks.forEach(w => {
      w.target = perWeekTarget;
    });
  }

  return weeks;
};

const formatCurrency = (amount: number): string => {
  if (amount >= 1000000000) {
    return `$${(amount / 1000000000).toFixed(1)}B`;
  }
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}k`;
  }
  return `$${amount.toLocaleString()}`;
};

const formatFullCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function DashboardChart({
  deals,
  organizationName,
  totalCommitted,
  totalInterested,
  totalTarget,
}: DashboardChartProps) {
  const [timeframe, setTimeframe] = useState<Timeframe>("month");
  const [showSampleData, setShowSampleData] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const weekData = useMemo(() => {
    if (showSampleData) {
      return generateSampleData();
    }
    return groupDealsByWeek(deals);
  }, [deals, showSampleData]);

  const selectedRange = useMemo(() => getSelectedRange(timeframe), [timeframe]);

  const monthLabels = useMemo(() => getMonthLabels(), []);

  // Calculate max value for scaling
  const maxValue = useMemo(() => {
    return Math.max(
      ...weekData.map(d => Math.max(d.committed, d.interested, d.target)),
      1
    );
  }, [weekData]);

  // Calculate totals for selected period
  const selectedTotals = useMemo(() => {
    let committed = 0;
    let interested = 0;
    let target = 0;

    for (let i = selectedRange.start; i <= selectedRange.end; i++) {
      committed += weekData[i]?.committed || 0;
      interested += weekData[i]?.interested || 0;
      target += weekData[i]?.target || 0;
    }

    return { committed, interested, target };
  }, [weekData, selectedRange]);

  const commitmentProgress = selectedTotals.target > 0
    ? Math.round((selectedTotals.committed / selectedTotals.target) * 100)
    : 0;

  // Check if there's any real data to display
  const hasData = useMemo(() => {
    if (showSampleData) return true;
    return weekData.some(w => w.committed > 0 || w.interested > 0 || w.target > 0);
  }, [weekData, showSampleData]);

  // Generate target line path
  const generateTargetLinePath = (): string => {
    if (weekData.length === 0) return "";

    const width = 100;
    const height = 100;
    const barWidth = width / 52;

    const points = weekData.map((d, i) => {
      const x = barWidth * i + barWidth / 2;
      const y = height - (d.target / maxValue) * (height - 10);
      return { x, y };
    });

    // Create smooth bezier curve
    let path = `M${points[0].x},${points[0].y}`;

    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx1 = prev.x + (curr.x - prev.x) * 0.5;
      const cpx2 = prev.x + (curr.x - prev.x) * 0.5;
      path += ` C${cpx1},${prev.y} ${cpx2},${curr.y} ${curr.x},${curr.y}`;
    }

    return path;
  };

  // Get hovered week data for tooltip
  const hoveredData = hoveredIndex !== null ? weekData[hoveredIndex] : null;
  const hoveredProgress = hoveredData && hoveredData.target > 0
    ? Math.round((hoveredData.committed / hoveredData.target) * 100)
    : 0;

  return (
    <>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-medium tracking-tight">{organizationName}</h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {(["week", "month", "quarter", "year"] as Timeframe[]).map((t) => (
              <button
                key={t}
                onClick={() => setTimeframe(t)}
                className={`px-3 py-1.5 text-sm transition-colors ${
                  timeframe === t
                    ? "font-medium text-foreground border-b-2 border-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowSampleData(!showSampleData)}
            className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
              showSampleData
                ? "bg-foreground text-background border-foreground"
                : "bg-transparent text-muted-foreground border-border hover:border-foreground hover:text-foreground"
            }`}
          >
            {showSampleData ? "Hide Sample Data" : "Show Sample Data"}
          </button>
        </div>
      </div>

      {/* Main Metric Section */}
      <div className="mb-12">
        <p className="section-label mb-4">Total Capital Committed</p>

        <div className="flex items-center gap-3 mb-6">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-foreground"></span>
            <span className="text-sm">Committed</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-foreground/40"></span>
            <span className="text-sm text-muted-foreground">Interested</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-foreground"></span>
            <span className="text-sm text-muted-foreground">Target</span>
          </span>
        </div>

        {hasData ? (
          <>
            {/* Large Number Display */}
            <div className="text-center py-8">
              <h2 className="metric-number text-7xl md:text-8xl tracking-tight">
                {formatFullCurrency(selectedTotals.committed)}
              </h2>
              <p className="text-muted-foreground mt-2">
                Committed in selected {timeframe}
              </p>
            </div>

            {/* Chart Visualization */}
            <div className="mt-8 relative">
              <div
                className="h-32 flex items-end gap-[1px] relative"
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {weekData.map((d, i) => {
                  const committedHeight = maxValue > 0 ? (d.committed / maxValue) * 100 : 0;
                  const interestedHeight = maxValue > 0 ? (d.interested / maxValue) * 100 : 0;
                  const isInRange = i >= selectedRange.start && i <= selectedRange.end;
                  const isHovered = hoveredIndex === i;
                  const showInterested = d.interested > d.committed;

                  return (
                    <div
                      key={i}
                      className="flex-1 relative flex items-end justify-center cursor-pointer"
                      style={{ height: "100%" }}
                      onMouseEnter={() => setHoveredIndex(i)}
                    >
                      {/* Interested bar (lighter, behind) - only visible if > committed */}
                      {showInterested && (
                        <div
                          className={`absolute bottom-0 w-full rounded-t transition-all duration-150 ${
                            isInRange || isHovered
                              ? "bg-foreground/40"
                              : "bg-muted-foreground/20"
                          }`}
                          style={{ height: `${interestedHeight}%` }}
                        />
                      )}
                      {/* Committed bar */}
                      <div
                        className={`relative w-full rounded-t transition-all duration-150 ${
                          isInRange || isHovered
                            ? "bg-foreground"
                            : "bg-muted-foreground/30"
                        }`}
                        style={{ height: `${committedHeight}%` }}
                      />
                    </div>
                  );
                })}

                {/* Hover Tooltip */}
                {hoveredIndex !== null && hoveredData && (
                  <div
                    className="absolute glass-menu rounded-xl px-4 py-3 z-10 pointer-events-none min-w-[160px]"
                    style={{
                      left: `${(hoveredIndex / 52) * 100}%`,
                      top: "-8px",
                      transform: hoveredIndex > 40 ? "translateX(-100%)" : hoveredIndex < 10 ? "translateX(0%)" : "translateX(-50%)",
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-base">{formatCurrency(hoveredData.committed)}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-[hsl(var(--success))] text-white">
                        {hoveredProgress}%
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(hoveredData.interested)} interested
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Week of {hoveredData.label}
                    </p>
                  </div>
                )}
              </div>

              {/* Target line overlay */}
              <div className="absolute inset-0 pointer-events-none" style={{ height: "128px" }}>
                <svg
                  className="w-full h-full"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                >
                  <path
                    d={generateTargetLinePath()}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="0.5"
                    className="text-foreground"
                    vectorEffect="non-scaling-stroke"
                    style={{ strokeWidth: "1.5px" }}
                  />
                </svg>
              </div>
            </div>

            {/* Selection indicator bar */}
            <div className="mt-3 relative h-6">
              {/* Background track */}
              <div className="absolute inset-0 flex items-center">
                <div className="w-full h-3 bg-muted/20 rounded-full relative overflow-hidden">
                  {/* Selected range - filled black */}
                  <div
                    className="absolute h-full bg-foreground rounded-full transition-all duration-300"
                    style={{
                      left: `${(selectedRange.start / 52) * 100}%`,
                      width: `${((selectedRange.end - selectedRange.start + 1) / 52) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Month labels */}
            <div className="relative h-6 mt-2">
              {monthLabels.map((m, idx) => (
                <span
                  key={idx}
                  className="absolute text-xs text-muted-foreground transform -translate-x-1/2"
                  style={{ left: `${(m.position / 52) * 100}%` }}
                >
                  {m.label}
                </span>
              ))}
            </div>
          </>
        ) : (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-muted-foreground/50"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-foreground mb-1">No data available yet</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Start tracking deals to see your capital commitments visualized here.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
