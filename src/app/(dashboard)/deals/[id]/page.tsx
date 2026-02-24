import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { DealDetailClient } from "./DealDetailClient";
import { DealLPRelationshipWithLP } from "@/lib/supabase/types";
import { EmailsWithFilters } from "@/components/deals/EmailsWithFilters";
import { LPInvolvementSection } from "@/components/deals/LPInvolvementSection";
import { EditDealButton } from "@/components/deals/EditDealButton";
import { InvestorUpdatesCard } from "@/components/deal/InvestorUpdatesCard";

export const dynamic = "force-dynamic";

export default async function DealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const { id } = await params;

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
    return notFound();
  }

  // Fetch deal
  const { data: deal, error: dealError } = await supabase
    .from("deals")
    .select("*")
    .eq("id", id)
    .eq("organization_id", userData.organization_id)
    .single();

  if (dealError || !deal) {
    return notFound();
  }

  // Fetch LP relationships for this deal with LP contact info
  const { data: lpRelationships } = await supabase
    .from("deal_lp_relationships")
    .select(`
      *,
      lp_contacts (
        id,
        name,
        email,
        firm,
        special_fee_percent,
        special_carry_percent
      )
    `)
    .eq("deal_id", id)
    .order("updated_at", { ascending: false });

  // Calculate close readiness metrics (allocated LPs only)
  const committedRelationships = lpRelationships?.filter(
    (r) => r.status === "allocated"
  ) || [];

  const totalLPs = committedRelationships.length;
  const totalAllocated = committedRelationships.reduce(
    (sum, r) => sum + (r.allocated_amount || 0),
    0
  );
  const totalWired = committedRelationships.reduce(
    (sum, r) => sum + (r.wire_amount_received || 0),
    0
  );
  const targetRaise = deal.target_raise || 0;

  const pendingItems = committedRelationships
    .filter((r) => {
      const pendingWire = r.wire_status !== "complete" && (r.allocated_amount || 0) > 0;
      return pendingWire;
    })
    .map((r) => ({
      lpId: r.lp_contact_id,
      lpName: r.lp_contacts?.name || "Unknown",
      pendingWire: r.wire_status !== "complete" && (r.allocated_amount || 0) > 0,
      amount: r.allocated_amount || r.committed_amount || 0,
    }));

  const closeReadinessMetrics = {
    wiredPercent: totalAllocated > 0 ? (totalWired / totalAllocated) * 100 : 0,
    allocatedPercent: targetRaise > 0 ? (totalAllocated / targetRaise) * 100 : 0,
    totalLPs,
    totalAllocated,
    totalWired,
    targetRaise,
    pendingItems,
  };

  // Fetch recent emails related to this deal
  const { data: relatedEmails } = await supabase
    .from("emails_parsed")
    .select(`
      *,
      emails_raw (
        id,
        from_email,
        from_name,
        subject,
        received_at,
        body_text,
        thread_id,
        message_id,
        email_responses (
          final_response,
          sent_at,
          question_text
        )
      ),
      lp_contacts (
        id,
        name,
        email,
        firm
      )
    `)
    .eq("detected_deal_id", id)
    .order("parsed_at", { ascending: false })
    .limit(50);

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "committed":
      case "allocated":
        return "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]";
      case "interested":
        return "bg-foreground/10 text-foreground";
      case "contacted":
        return "bg-secondary text-muted-foreground";
      case "declined":
        return "bg-destructive/10 text-destructive";
      default:
        return "bg-secondary text-muted-foreground";
    }
  };

  const getDealStatusColor = (status: string) => {
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

  // Group LPs by status
  const lpsByStatus = {
    committed: lpRelationships?.filter((r) => r.status === "committed" || r.status === "allocated") || [],
    interested: lpRelationships?.filter((r) => r.status === "interested") || [],
    contacted: lpRelationships?.filter((r) => r.status === "contacted") || [],
    declined: lpRelationships?.filter((r) => r.status === "declined") || [],
  };

  return (
    <div className="px-8 py-6">
      {/* Header */}
      <div className="mb-8">
        <Link href="/deals" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Deals
        </Link>
        <div className="flex items-center justify-between mt-4">
          <div>
            <h1 className="text-3xl font-medium tracking-tight">
              {deal.name}
              {deal.company_name && (
                <span className="text-muted-foreground"> ({deal.company_name})</span>
              )}
            </h1>
            {deal.description && (
              <p className="text-sm text-muted-foreground mt-1">{deal.description}</p>
            )}
            {/* Deal Terms & Metadata */}
            {(deal.fee_percent || deal.carry_percent || deal.investment_stage || deal.investment_type || deal.created_date || deal.close_date) && (
              <div className="flex items-center gap-4 mt-2 flex-wrap">
                {deal.fee_percent && (
                  <span className="text-sm text-muted-foreground">
                    Fee: <span className="font-medium text-foreground">{deal.fee_percent}%</span>
                  </span>
                )}
                {deal.carry_percent && (
                  <span className="text-sm text-muted-foreground">
                    Carry: <span className="font-medium text-foreground">{deal.carry_percent}%</span>
                  </span>
                )}
                {deal.investment_stage && (
                  <span className="text-sm text-muted-foreground">
                    Stage: <span className="font-medium text-foreground">{deal.investment_stage}</span>
                  </span>
                )}
                {deal.investment_type && (
                  <span className="text-sm text-muted-foreground">
                    Type: <span className="font-medium text-foreground">{deal.investment_type}</span>
                  </span>
                )}
                {deal.created_date && (
                  <span className="text-sm text-muted-foreground">
                    Created: <span className="font-medium text-foreground">{new Date(deal.created_date).toLocaleDateString()}</span>
                  </span>
                )}
                {deal.close_date && (
                  <span className="text-sm text-muted-foreground">
                    Close: <span className="font-medium text-foreground">{new Date(deal.close_date).toLocaleDateString()}</span>
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <EditDealButton
              deal={{
                id: deal.id,
                name: deal.name,
                company_name: deal.company_name,
                description: deal.description,
                target_raise: deal.target_raise,
                min_check_size: deal.min_check_size,
                max_check_size: deal.max_check_size,
                fee_percent: deal.fee_percent,
                carry_percent: deal.carry_percent,
                status: deal.status,
                memo_url: deal.memo_url,
                created_date: deal.created_date,
                close_date: deal.close_date,
                investment_stage: deal.investment_stage,
                investment_type: deal.investment_type,
                founder_email: deal.founder_email,
                investor_update_frequency: deal.investor_update_frequency,
              }}
            />
            <span className={`px-4 py-2 rounded-xl text-sm font-medium capitalize ${getDealStatusColor(deal.status)}`}>
              {deal.status}
            </span>
          </div>
        </div>
      </div>

      {/* Deal Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-card rounded-2xl p-6 border border-border">
          <p className="section-label mb-2">Target Raise</p>
          <p className="metric-number text-3xl">{formatCurrency(deal.target_raise)}</p>
        </div>
        <div className="bg-card rounded-2xl p-6 border border-border">
          <p className="section-label mb-2">Allocated</p>
          <p className="metric-number text-3xl text-[hsl(var(--success))]">{formatCurrency(totalAllocated)}</p>
          {deal.target_raise && deal.target_raise > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {Math.round((totalAllocated / deal.target_raise) * 100)}% of target
            </p>
          )}
        </div>
        <div className="bg-card rounded-2xl p-6 border border-border">
          <p className="section-label mb-2">Interested</p>
          <p className="metric-number text-3xl">{formatCurrency(deal.total_interested)}</p>
        </div>
        <div className="bg-card rounded-2xl p-6 border border-border">
          <p className="section-label mb-2">LPs Involved</p>
          <p className="metric-number text-3xl">{lpRelationships?.length || 0}</p>
        </div>
      </div>

      {/* Close Readiness / Investor Updates + Allocated LPs row */}
      {committedRelationships.length > 0 && deal.status !== "closed" && (
        <DealDetailClient
          dealId={deal.id}
          dealStatus={deal.status}
          closeReadinessMetrics={closeReadinessMetrics}
          committedRelationships={committedRelationships as DealLPRelationshipWithLP[]}
        />
      )}

      {deal.status === "closed" && (
        <div className="flex gap-6 mb-6">
          <div className="w-1/2 h-[32rem]">
            <InvestorUpdatesCard
              dealId={deal.id}
              dealName={deal.name}
              companyName={deal.company_name}
              closeDate={deal.close_date}
              founderEmail={deal.founder_email}
              investorUpdateFrequency={deal.investor_update_frequency}
            />
          </div>

          {committedRelationships.length > 0 && (
            <DealDetailClient
              dealId={deal.id}
              dealStatus={deal.status}
              closeReadinessMetrics={closeReadinessMetrics}
              committedRelationships={committedRelationships as DealLPRelationshipWithLP[]}
              hideCloseReadiness
            />
          )}
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* LP Involvement */}
        <div className="col-span-2 space-y-6">
          <LPInvolvementSection
            lpRelationships={lpRelationships || []}
            dealId={deal.id}
            dealTerms={{
              fee_percent: deal.fee_percent,
              carry_percent: deal.carry_percent,
            }}
          />
        </div>

        {/* Sidebar - Recent Emails */}
        <div className="space-y-6">
          <EmailsWithFilters
            emails={relatedEmails || []}
            dealId={deal.id}
            dealName={deal.name}
          />
        </div>
      </div>
    </div>
  );
}
