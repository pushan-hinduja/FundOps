import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ArrowUpRight, TrendingUp, Users, Briefcase, DollarSign } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Get user's organization
  const { data: userData } = await supabase
    .from("users")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  // Fetch deals for metrics
  let deals: any[] = [];
  let lpCount = 0;

  if (userData?.organization_id) {
    const { data: dealsData } = await supabase
      .from("deals")
      .select("*")
      .eq("organization_id", userData.organization_id);
    deals = dealsData || [];

    const { count } = await supabase
      .from("lp_contacts")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", userData.organization_id);
    lpCount = count || 0;
  }

  // Calculate metrics
  const totalCommitted = deals.reduce((sum, deal) => sum + (deal.total_committed || 0), 0);
  const totalInterested = deals.reduce((sum, deal) => sum + (deal.total_interested || 0), 0);
  const totalTarget = deals.reduce((sum, deal) => sum + (deal.target_raise || 0), 0);
  const activeDeals = deals.filter(deal => deal.status === "active").length;

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000000) {
      return `$${(amount / 1000000000).toFixed(1)}B`;
    }
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}k`;
    }
    return `$${amount.toLocaleString()}`;
  };

  const formatFullCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Commitment progress percentage
  const commitmentProgress = totalTarget > 0 ? Math.round((totalCommitted / totalTarget) * 100) : 0;

  return (
    <div className="px-8 py-6">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-medium tracking-tight">Dashboard</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Briefcase className="w-4 h-4" />
              Deals
            </span>
            <span className="text-muted-foreground/40">/</span>
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Users className="w-4 h-4" />
              LPs
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            Week
          </button>
          <button className="px-3 py-1.5 text-sm font-medium text-foreground border-b-2 border-foreground">
            Month
          </button>
          <button className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            Quarter
          </button>
          <button className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            Year
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
            <span className="w-2 h-2 rounded-full bg-muted-foreground/30"></span>
            <span className="text-sm text-muted-foreground">Interested</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-muted-foreground/15"></span>
            <span className="text-sm text-muted-foreground">Target</span>
          </span>
        </div>

        {/* Large Number Display */}
        <div className="text-center py-8">
          <h2 className="metric-number text-7xl md:text-8xl tracking-tight">
            {formatFullCurrency(totalCommitted)}
          </h2>
          <p className="text-muted-foreground mt-2">Total Committed</p>
        </div>

        {/* Progress Visualization */}
        <div className="mt-8 relative">
          <div className="h-24 flex items-end gap-px">
            {/* Simple bar chart visualization */}
            {Array.from({ length: 40 }).map((_, i) => {
              const height = Math.random() * 60 + 20;
              const isHighlighted = i >= 15 && i <= 25;
              return (
                <div
                  key={i}
                  className={`flex-1 rounded-t transition-all ${
                    isHighlighted ? "bg-foreground" : "bg-muted-foreground/20"
                  }`}
                  style={{ height: `${height}%` }}
                />
              );
            })}
          </div>

          {/* Trend line overlay */}
          <div className="absolute inset-0 pointer-events-none">
            <svg className="w-full h-full" viewBox="0 0 400 100" preserveAspectRatio="none">
              <path
                d="M0,80 Q50,75 100,60 T200,40 T300,35 T400,30"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="text-foreground"
              />
            </svg>
          </div>

          {/* Tooltip */}
          <div className="absolute top-4 right-1/3 bg-card border border-border rounded-lg px-3 py-2 shadow-lg">
            <div className="flex items-center gap-2">
              <span className="font-medium">{formatCurrency(totalCommitted)}</span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-[hsl(var(--success))] text-white">
                +{commitmentProgress}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">of target raised</p>
          </div>
        </div>

        {/* Time labels */}
        <div className="flex justify-between mt-4 text-xs text-muted-foreground">
          <span>Jan</span>
          <span>Feb</span>
          <span>Mar</span>
          <span>Apr</span>
          <span>May</span>
          <span>Jun</span>
          <span>Jul</span>
          <span>Aug</span>
          <span>Sep</span>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Deals */}
        <div className="bg-card rounded-2xl p-6 border border-border">
          <div className="flex items-center justify-between mb-4">
            <p className="section-label">Active Deals</p>
            <div className="flex items-center gap-1">
              <button className="p-1 hover:bg-secondary rounded">
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
              </button>
              <button className="p-1 hover:bg-secondary rounded">
                <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          <h3 className="metric-number text-4xl mb-1">{activeDeals}</h3>
          <p className="text-sm text-muted-foreground">Deals</p>

          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-foreground"></span>
                Active
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-muted-foreground/30"></span>
                Total: {deals.length}
              </span>
            </div>
          </div>
        </div>

        {/* Total Interested */}
        <div className="bg-card rounded-2xl p-6 border border-border">
          <div className="flex items-center justify-between mb-4">
            <p className="section-label">Pipeline Value</p>
            <div className="flex items-center gap-1">
              <button className="p-1 hover:bg-secondary rounded">
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
              </button>
              <button className="p-1 hover:bg-secondary rounded">
                <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          <h3 className="metric-number text-4xl mb-1">{formatCurrency(totalInterested)}</h3>
          <p className="text-sm text-muted-foreground">Interested</p>

          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-xs">
                <span className="w-2 h-2 rounded-full bg-[hsl(var(--success))]"></span>
                Active pipeline
              </span>
            </div>
          </div>
        </div>

        {/* LP Contacts */}
        <div className="bg-card rounded-2xl p-6 border border-border">
          <div className="flex items-center justify-between mb-4">
            <p className="section-label">LP Contacts</p>
            <div className="flex items-center gap-1">
              <button className="p-1 hover:bg-secondary rounded">
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
              </button>
              <button className="p-1 hover:bg-secondary rounded">
                <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          <h3 className="metric-number text-4xl mb-1">{lpCount}</h3>
          <p className="text-sm text-muted-foreground">Total contacts</p>

          <div className="mt-4 pt-4 border-t border-border">
            <Link
              href="/lps"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              View all contacts
            </Link>
          </div>
        </div>

        {/* Target Progress */}
        <div className="bg-card rounded-2xl p-6 border border-border">
          <div className="flex items-center justify-between mb-4">
            <p className="section-label">Target Progress</p>
            <div className="flex items-center gap-1">
              <button className="p-1 hover:bg-secondary rounded">
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
              </button>
              <button className="p-1 hover:bg-secondary rounded">
                <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          <h3 className="metric-number text-4xl mb-1">{formatCurrency(totalTarget)}</h3>
          <p className="text-sm text-muted-foreground">Total target</p>

          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{commitmentProgress}%</span>
            </div>
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-foreground rounded-full transition-all"
                style={{ width: `${Math.min(commitmentProgress, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
