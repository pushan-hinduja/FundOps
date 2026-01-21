import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

export const dynamic = "force-dynamic";

export default async function DealDetailPage({
  params,
}: {
  params: { id: string };
}) {
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
    return notFound();
  }

  // Fetch deal
  const { data: deal, error: dealError } = await supabase
    .from("deals")
    .select("*")
    .eq("id", params.id)
    .eq("organization_id", userData.organization_id)
    .single();

  if (dealError || !deal) {
    return notFound();
  }

  // Fetch LP relationships for this deal
  const { data: lpRelationships } = await supabase
    .from("deal_lp_relationships")
    .select(`
      *,
      lp_contacts (
        id,
        name,
        email,
        firm
      )
    `)
    .eq("deal_id", params.id)
    .order("updated_at", { ascending: false });

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
    .eq("detected_deal_id", params.id)
    .order("parsed_at", { ascending: false })
    .limit(20);

  const formatCurrency = (amount: number | null) => {
    if (!amount) return "-";
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
        return "bg-green-100 text-green-800";
      case "interested":
        return "bg-blue-100 text-blue-800";
      case "contacted":
        return "bg-gray-100 text-gray-800";
      case "declined":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getDealStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "draft":
        return "bg-gray-100 text-gray-800";
      case "closed":
        return "bg-blue-100 text-blue-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
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
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <Link href="/deals" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to Deals
        </Link>
        <div className="flex items-center justify-between mt-2">
          <div>
            <h1 className="text-2xl font-bold">{deal.name}</h1>
            {deal.company_name && (
              <p className="text-muted-foreground">{deal.company_name}</p>
            )}
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getDealStatusColor(deal.status)}`}>
            {deal.status}
          </span>
        </div>
      </div>

      {/* Deal Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Target Raise</p>
          <p className="text-2xl font-bold">{formatCurrency(deal.target_raise)}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Committed</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(deal.total_committed)}</p>
          {deal.target_raise && deal.target_raise > 0 && (
            <p className="text-xs text-muted-foreground">
              {Math.round(((deal.total_committed || 0) / deal.target_raise) * 100)}% of target
            </p>
          )}
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Interested</p>
          <p className="text-2xl font-bold text-blue-600">{formatCurrency(deal.total_interested)}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">LPs Involved</p>
          <p className="text-2xl font-bold">{lpRelationships?.length || 0}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* LP Involvement */}
        <div className="col-span-2 space-y-6">
          {/* Committed LPs */}
          {lpsByStatus.committed.length > 0 && (
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4 text-green-600">
                Committed ({lpsByStatus.committed.length})
              </h2>
              <div className="space-y-3">
                {lpsByStatus.committed.map((rel: any) => (
                  <div key={rel.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div>
                      <Link href={`/lps/${rel.lp_contacts?.id}`} className="font-medium hover:text-primary">
                        {rel.lp_contacts?.name}
                      </Link>
                      <p className="text-sm text-muted-foreground">{rel.lp_contacts?.firm || rel.lp_contacts?.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">{formatCurrency(rel.committed_amount)}</p>
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
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4 text-blue-600">
                Interested ({lpsByStatus.interested.length})
              </h2>
              <div className="space-y-3">
                {lpsByStatus.interested.map((rel: any) => (
                  <div key={rel.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div>
                      <Link href={`/lps/${rel.lp_contacts?.id}`} className="font-medium hover:text-primary">
                        {rel.lp_contacts?.name}
                      </Link>
                      <p className="text-sm text-muted-foreground">{rel.lp_contacts?.firm || rel.lp_contacts?.email}</p>
                    </div>
                    <div className="text-right">
                      {rel.committed_amount && (
                        <p className="font-medium text-blue-600">{formatCurrency(rel.committed_amount)} potential</p>
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
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4">
                Contacted ({lpsByStatus.contacted.length})
              </h2>
              <div className="space-y-3">
                {lpsByStatus.contacted.map((rel: any) => (
                  <div key={rel.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <Link href={`/lps/${rel.lp_contacts?.id}`} className="font-medium hover:text-primary">
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
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4 text-red-600">
                Declined ({lpsByStatus.declined.length})
              </h2>
              <div className="space-y-3">
                {lpsByStatus.declined.map((rel: any) => (
                  <div key={rel.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div>
                      <Link href={`/lps/${rel.lp_contacts?.id}`} className="font-medium hover:text-primary">
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
            <div className="bg-card border border-border rounded-lg p-6 text-center">
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
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Deal Info</h2>
            <div className="space-y-3 text-sm">
              {deal.description && (
                <div>
                  <p className="text-muted-foreground">Description</p>
                  <p>{deal.description}</p>
                </div>
              )}
              <div>
                <p className="text-muted-foreground">Check Size Range</p>
                <p>
                  {deal.min_check_size || deal.max_check_size
                    ? `${formatCurrency(deal.min_check_size)} - ${formatCurrency(deal.max_check_size)}`
                    : "-"}
                </p>
              </div>
              {deal.deadline && (
                <div>
                  <p className="text-muted-foreground">Deadline</p>
                  <p>{new Date(deal.deadline).toLocaleDateString()}</p>
                </div>
              )}
              {deal.memo_url && (
                <div>
                  <a
                    href={deal.memo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    View Memo →
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Recent Emails */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Recent Emails</h2>
            {relatedEmails && relatedEmails.length > 0 ? (
              <div className="space-y-3">
                {relatedEmails.slice(0, 10).map((parsed: any) => (
                  <div key={parsed.id} className="p-2 border-b border-border last:border-0">
                    <p className="font-medium text-sm truncate">
                      {parsed.emails_raw?.from_name || parsed.emails_raw?.from_email}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {parsed.emails_raw?.subject || "(no subject)"}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {parsed.intent && parsed.intent !== "neutral" && (
                        <span className={`text-xs px-1.5 py-0.5 rounded ${getStatusColor(parsed.intent)}`}>
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
