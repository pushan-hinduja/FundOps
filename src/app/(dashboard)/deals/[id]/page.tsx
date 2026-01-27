import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { DealDetailClient } from "./DealDetailClient";
import { DealLPRelationshipWithLP } from "@/lib/supabase/types";

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
        kyc_status,
        accreditation_status
      )
    `)
    .eq("deal_id", id)
    .order("updated_at", { ascending: false });

  // Get LP IDs that are committed/allocated to check for docs
  const committedLpIds = lpRelationships
    ?.filter((r) => r.status === "committed" || r.status === "allocated")
    .map((r) => r.lp_contact_id) || [];

  // Fetch documents for committed LPs to calculate close readiness
  let docsPerLP: Record<string, { hasApprovedDocs: boolean }> = {};
  if (committedLpIds.length > 0) {
    const { data: docs } = await supabase
      .from("lp_documents")
      .select("lp_contact_id, status")
      .in("lp_contact_id", committedLpIds);

    if (docs) {
      for (const doc of docs) {
        if (!docsPerLP[doc.lp_contact_id]) {
          docsPerLP[doc.lp_contact_id] = { hasApprovedDocs: false };
        }
        if (doc.status === "approved") {
          docsPerLP[doc.lp_contact_id].hasApprovedDocs = true;
        }
      }
    }
  }

  // Calculate close readiness metrics
  const committedRelationships = lpRelationships?.filter(
    (r) => r.status === "committed" || r.status === "allocated"
  ) || [];

  const totalLPs = committedRelationships.length;
  const lpsWithDocs = Object.values(docsPerLP).filter((d) => d.hasApprovedDocs).length;
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
      const hasDocs = docsPerLP[r.lp_contact_id]?.hasApprovedDocs || false;
      const pendingWire = r.wire_status !== "complete" && (r.allocated_amount || 0) > 0;
      return !hasDocs || pendingWire;
    })
    .map((r) => ({
      lpId: r.lp_contact_id,
      lpName: r.lp_contacts?.name || "Unknown",
      missingDocs: !docsPerLP[r.lp_contact_id]?.hasApprovedDocs,
      pendingWire: r.wire_status !== "complete" && (r.allocated_amount || 0) > 0,
      amount: r.allocated_amount || r.committed_amount || 0,
    }));

  const closeReadinessMetrics = {
    docsReceivedPercent: totalLPs > 0 ? (lpsWithDocs / totalLPs) * 100 : 0,
    wiredPercent: totalAllocated > 0 ? (totalWired / totalAllocated) * 100 : 0,
    allocatedPercent: targetRaise > 0 ? (totalAllocated / targetRaise) * 100 : 0,
    totalLPs,
    lpsWithDocs,
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
        received_at
      )
    `)
    .eq("detected_deal_id", id)
    .order("parsed_at", { ascending: false })
    .limit(20);

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
            <h1 className="text-3xl font-medium tracking-tight">{deal.name}</h1>
            {deal.company_name && (
              <p className="text-muted-foreground mt-1">{deal.company_name}</p>
            )}
          </div>
          <span className={`px-3 py-1.5 rounded-xl text-sm font-medium capitalize ${getDealStatusColor(deal.status)}`}>
            {deal.status}
          </span>
        </div>
      </div>

      {/* Deal Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-card border border-border rounded-2xl p-5">
          <p className="section-label mb-2">Target Raise</p>
          <p className="metric-number text-3xl">{formatCurrency(deal.target_raise)}</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5">
          <p className="section-label mb-2">Committed</p>
          <p className="metric-number text-3xl text-[hsl(var(--success))]">{formatCurrency(deal.total_committed)}</p>
          {deal.target_raise && deal.target_raise > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {Math.round(((deal.total_committed || 0) / deal.target_raise) * 100)}% of target
            </p>
          )}
        </div>
        <div className="bg-card border border-border rounded-2xl p-5">
          <p className="section-label mb-2">Interested</p>
          <p className="metric-number text-3xl">{formatCurrency(deal.total_interested)}</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5">
          <p className="section-label mb-2">LPs Involved</p>
          <p className="metric-number text-3xl">{lpRelationships?.length || 0}</p>
        </div>
      </div>

      {/* Close Readiness Dashboard - Only show if there are committed LPs */}
      {committedRelationships.length > 0 && (
        <DealDetailClient
          dealId={deal.id}
          closeReadinessMetrics={closeReadinessMetrics}
          committedRelationships={committedRelationships as DealLPRelationshipWithLP[]}
        />
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* LP Involvement */}
        <div className="col-span-2 space-y-6">
          {/* Committed LPs - shown via DealDetailClient above when present */}
          {committedRelationships.length === 0 && lpsByStatus.committed.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-6">
              <h2 className="text-lg font-medium mb-4 text-[hsl(var(--success))]">
                Committed ({lpsByStatus.committed.length})
              </h2>
              <div className="space-y-3">
                {lpsByStatus.committed.map((rel: any) => (
                  <div key={rel.id} className="flex items-center justify-between p-4 bg-[hsl(var(--success))]/5 rounded-xl">
                    <div>
                      <Link href={`/lps/${rel.lp_contacts?.id}`} className="font-medium hover:text-muted-foreground transition-colors">
                        {rel.lp_contacts?.name}
                      </Link>
                      <p className="text-sm text-muted-foreground">{rel.lp_contacts?.firm || rel.lp_contacts?.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-[hsl(var(--success))] metric-number text-lg">{formatCurrency(rel.committed_amount)}</p>
                      {rel.latest_response_at && (
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(rel.latest_response_at), { addSuffix: true })}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Interested LPs */}
          {lpsByStatus.interested.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-6">
              <h2 className="text-lg font-medium mb-4">
                Interested ({lpsByStatus.interested.length})
              </h2>
              <div className="space-y-3">
                {lpsByStatus.interested.map((rel: any) => (
                  <div key={rel.id} className="flex items-center justify-between p-4 bg-secondary/50 rounded-xl">
                    <div>
                      <Link href={`/lps/${rel.lp_contacts?.id}`} className="font-medium hover:text-muted-foreground transition-colors">
                        {rel.lp_contacts?.name}
                      </Link>
                      <p className="text-sm text-muted-foreground">{rel.lp_contacts?.firm || rel.lp_contacts?.email}</p>
                    </div>
                    <div className="text-right">
                      {rel.committed_amount && (
                        <p className="font-medium metric-number text-lg">{formatCurrency(rel.committed_amount)} potential</p>
                      )}
                      {rel.latest_response_at && (
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(rel.latest_response_at), { addSuffix: true })}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Contacted LPs */}
          {lpsByStatus.contacted.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-6">
              <h2 className="text-lg font-medium mb-4">
                Contacted ({lpsByStatus.contacted.length})
              </h2>
              <div className="space-y-3">
                {lpsByStatus.contacted.map((rel: any) => (
                  <div key={rel.id} className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl">
                    <div>
                      <Link href={`/lps/${rel.lp_contacts?.id}`} className="font-medium hover:text-muted-foreground transition-colors">
                        {rel.lp_contacts?.name}
                      </Link>
                      <p className="text-sm text-muted-foreground">{rel.lp_contacts?.firm || rel.lp_contacts?.email}</p>
                    </div>
                    <div className="text-right">
                      {rel.first_contact_at && (
                        <p className="text-xs text-muted-foreground">
                          Contacted {formatDistanceToNow(new Date(rel.first_contact_at), { addSuffix: true })}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Declined LPs */}
          {lpsByStatus.declined.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-6">
              <h2 className="text-lg font-medium mb-4 text-destructive">
                Declined ({lpsByStatus.declined.length})
              </h2>
              <div className="space-y-3">
                {lpsByStatus.declined.map((rel: any) => (
                  <div key={rel.id} className="flex items-center justify-between p-4 bg-destructive/5 rounded-xl">
                    <div>
                      <Link href={`/lps/${rel.lp_contacts?.id}`} className="font-medium hover:text-muted-foreground transition-colors">
                        {rel.lp_contacts?.name}
                      </Link>
                      <p className="text-sm text-muted-foreground">{rel.lp_contacts?.firm || rel.lp_contacts?.email}</p>
                    </div>
                    {rel.notes && (
                      <p className="text-sm text-muted-foreground max-w-xs truncate">{rel.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No LPs yet */}
          {(!lpRelationships || lpRelationships.length === 0) && (
            <div className="bg-card border border-border rounded-2xl p-8 text-center">
              <p className="text-muted-foreground">No LP involvement recorded yet.</p>
              <p className="text-sm text-muted-foreground mt-1">
                LP relationships are created when emails mentioning this deal are matched to LPs.
              </p>
            </div>
          )}
        </div>

        {/* Sidebar - Recent Activity */}
        <div className="space-y-6">
          {/* Deal Info */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <h2 className="text-lg font-medium mb-4">Deal Info</h2>
            <div className="space-y-4 text-sm">
              {deal.description && (
                <div className="py-3 border-b border-border">
                  <p className="text-muted-foreground mb-1">Description</p>
                  <p>{deal.description}</p>
                </div>
              )}
              <div className="py-3 border-b border-border">
                <p className="text-muted-foreground mb-1">Check Size Range</p>
                <p className="font-medium">
                  {deal.min_check_size || deal.max_check_size
                    ? `${formatCurrency(deal.min_check_size)} - ${formatCurrency(deal.max_check_size)}`
                    : "-"}
                </p>
              </div>
              {deal.deadline && (
                <div className="py-3 border-b border-border">
                  <p className="text-muted-foreground mb-1">Deadline</p>
                  <p className="font-medium">{new Date(deal.deadline).toLocaleDateString()}</p>
                </div>
              )}
              {deal.memo_url && (
                <div className="py-3">
                  <a
                    href={deal.memo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-foreground hover:text-muted-foreground transition-colors font-medium"
                  >
                    View Memo
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Recent Emails */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <h2 className="text-lg font-medium mb-4">Recent Emails</h2>
            {relatedEmails && relatedEmails.length > 0 ? (
              <div className="space-y-3">
                {relatedEmails.slice(0, 10).map((parsed: any) => (
                  <div key={parsed.id} className="py-3 border-b border-border last:border-0">
                    <p className="font-medium text-sm truncate">
                      {parsed.emails_raw?.from_name || parsed.emails_raw?.from_email}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {parsed.emails_raw?.subject || "(no subject)"}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      {parsed.intent && parsed.intent !== "neutral" && (
                        <span className={`text-xs px-2 py-0.5 rounded-lg font-medium ${getStatusColor(parsed.intent)}`}>
                          {parsed.intent}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {parsed.emails_raw?.received_at &&
                          formatDistanceToNow(new Date(parsed.emails_raw.received_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No emails matched to this deal yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
