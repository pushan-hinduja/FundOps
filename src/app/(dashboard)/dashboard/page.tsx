import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ArrowUpRight, TrendingUp } from "lucide-react";
import DashboardChart from "@/components/dashboard/DashboardChart";
import { Deal } from "@/lib/supabase/types";

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

  // Fetch organization name
  let organizationName = "Dashboard";
  if (userData?.organization_id) {
    const { data: orgData } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", userData.organization_id)
      .single();

    if (orgData?.name) {
      organizationName = orgData.name;
    }
  }

  // Fetch deals for metrics
  let deals: Deal[] = [];
  let lpCount = 0;

  if (userData?.organization_id) {
    const { data: dealsData } = await supabase
      .from("deals")
      .select("*")
      .eq("organization_id", userData.organization_id);
    deals = (dealsData || []) as Deal[];

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

  // Commitment progress percentage
  const commitmentProgress = totalTarget > 0 ? Math.round((totalCommitted / totalTarget) * 100) : 0;

  return (
    <div className="px-8 py-6">
      {/* Chart Section - Client Component */}
      <DashboardChart
        deals={deals}
        organizationName={organizationName}
        totalCommitted={totalCommitted}
        totalInterested={totalInterested}
        totalTarget={totalTarget}
      />

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
