import { createClient } from "@/lib/supabase/server";
import { EmailSyncButton } from "@/components/shared/EmailSyncButton";
import { BackfillSyncButton } from "@/components/shared/BackfillSyncButton";
import Link from "next/link";
import { Briefcase, Plus, ArrowUpRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DealsPage() {
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

  if (!userData?.organization_id) {
    return (
      <div className="px-8 py-6">
        <h1 className="text-3xl font-medium tracking-tight mb-4">Deals</h1>
        <div className="bg-card p-8 rounded-2xl text-center border border-border">
          <p className="text-muted-foreground">
            Set up your organization first.
          </p>
          <Link href="/settings" className="text-foreground font-medium hover:underline mt-2 inline-block">
            Go to Settings
          </Link>
        </div>
      </div>
    );
  }

  // Fetch deals
  const { data: deals, error } = await supabase
    .from("deals")
    .select("*")
    .eq("organization_id", userData.organization_id)
    .order("created_at", { ascending: false });

  const formatCurrency = (amount: number | null) => {
    if (!amount) return "-";
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}k`;
    }
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case "active":
        return "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]";
      case "draft":
        return "bg-secondary text-muted-foreground";
      case "closed":
        return "bg-foreground/10 text-foreground";
      case "cancelled":
        return "bg-destructive/10 text-destructive";
      default:
        return "bg-secondary text-muted-foreground";
    }
  };

  return (
    <div className="px-8 py-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-medium tracking-tight">Deals</h1>
          <p className="text-muted-foreground mt-1">Manage your fundraising deals</p>
        </div>
        <div className="flex items-center gap-3">
          <BackfillSyncButton />
          <EmailSyncButton />
          <Link
            href="/deals/new"
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            New Deal
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-xl mb-6">
          Error loading deals: {error.message}
        </div>
      )}

      {!deals || deals.length === 0 ? (
        <div className="bg-card p-12 rounded-2xl text-center border border-border">
          <div className="w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Briefcase className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">No deals yet</h3>
          <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
            Create your first deal to start tracking LP responses and manage your fundraising pipeline.
          </p>
          <Link
            href="/deals/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            Create Deal
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {deals.map((deal) => (
            <Link
              key={deal.id}
              href={`/deals/${deal.id}`}
              className="group bg-card border border-border rounded-2xl p-6 hover:border-foreground/20 hover:shadow-sm transition-all"
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

              <div className="mt-4 flex items-center justify-end">
                <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors flex items-center gap-1">
                  View details
                  <ArrowUpRight className="w-3 h-3" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
