import { createClient } from "@/lib/supabase/server";
import { EmailSyncButton } from "@/components/shared/EmailSyncButton";
import { OrgGuard } from "@/components/shared/OrgGuard";
import Link from "next/link";
import { Briefcase, Plus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { DealsGrid } from "@/components/deals/DealsGrid";

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
      <div className="px-4 md:px-8 py-6">
        <h1 className="text-3xl font-medium tracking-tight mb-4">Deals</h1>
        <div className="glass-card p-8 rounded-2xl text-center">
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

  // Fetch last sync time
  const { data: lastSyncAccount } = await supabase
    .from("auth_accounts")
    .select("last_sync_at")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .not("last_sync_at", "is", null)
    .order("last_sync_at", { ascending: false })
    .limit(1)
    .single();

  const lastSyncAt = lastSyncAccount?.last_sync_at
    ? formatDistanceToNow(new Date(lastSyncAccount.last_sync_at), { addSuffix: true })
    : null;

  // Fetch deals
  const { data: deals, error } = await supabase
    .from("deals")
    .select("*")
    .eq("organization_id", userData.organization_id)
    .order("created_at", { ascending: false });

  // Fetch supplementary data for cards
  const dealIds = (deals || []).map((d) => d.id);

  // Votes per deal (for draft cards)
  const { data: allVotes } = dealIds.length > 0
    ? await supabase.from("deal_votes").select("deal_id, vote").in("deal_id", dealIds)
    : { data: [] };

  // Draft data (for valuation on draft cards)
  const { data: allDraftData } = dealIds.length > 0
    ? await supabase.from("deal_draft_data").select("deal_id, valuation, round_size").in("deal_id", dealIds)
    : { data: [] };

  // LP counts per deal (for closed cards)
  const { data: allRelationships } = dealIds.length > 0
    ? await supabase
        .from("deal_lp_relationships")
        .select("deal_id, status, allocated_amount")
        .in("deal_id", dealIds)
        .in("status", ["committed", "allocated"])
    : { data: [] };

  // Org member count (for vote %) — check both user_organizations and users table
  const { data: orgMembersNew } = await supabase
    .from("user_organizations")
    .select("user_id")
    .eq("organization_id", userData.organization_id);
  const { data: orgMembersLegacy } = await supabase
    .from("users")
    .select("id")
    .eq("organization_id", userData.organization_id);

  const allMemberIds = new Set([
    ...(orgMembersNew || []).map((m) => m.user_id),
    ...(orgMembersLegacy || []).map((m) => m.id),
  ]);
  const totalMembers = allMemberIds.size || 1;

  // Next investor update per deal (for closed cards)
  const { data: allUpdates } = dealIds.length > 0
    ? await supabase
        .from("investor_updates")
        .select("deal_id, due_date, status")
        .in("deal_id", dealIds)
        .in("status", ["pending_request", "request_sent"])
        .order("due_date", { ascending: true })
    : { data: [] };

  // Build supplementary data map
  const dealExtras: Record<string, {
    votesSummary?: { up: number; down: number; sideways: number; total: number; memberCount: number };
    valuation?: number | null;
    roundSize?: number | null;
    lpCount?: number;
    totalAllocated?: number;
    nextUpdateDate?: string | null;
  }> = {};

  for (const d of deals || []) {
    const extras: typeof dealExtras[string] = {};

    if (d.status === "draft") {
      const votes = (allVotes || []).filter((v) => v.deal_id === d.id);
      extras.votesSummary = {
        up: votes.filter((v) => v.vote === "up").length,
        down: votes.filter((v) => v.vote === "down").length,
        sideways: votes.filter((v) => v.vote === "sideways").length,
        total: votes.length,
        memberCount: totalMembers,
      };
      const draft = (allDraftData || []).find((dd) => dd.deal_id === d.id);
      extras.valuation = draft?.valuation ?? null;
      extras.roundSize = draft?.round_size ?? null;
    }

    if (d.status === "closed") {
      const rels = (allRelationships || []).filter((r) => r.deal_id === d.id);
      extras.lpCount = rels.length;
      extras.totalAllocated = rels.reduce((sum, r) => sum + (Number(r.allocated_amount) || 0), 0);
      const nextUpdate = (allUpdates || []).find((u) => u.deal_id === d.id);
      extras.nextUpdateDate = nextUpdate?.due_date ?? null;
    }

    dealExtras[d.id] = extras;
  }

  return (
    <OrgGuard>
    <div className="px-4 md:px-8 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-medium tracking-tight">Deals</h1>
          <p className="text-muted-foreground mt-1">Manage your fundraising deals</p>
        </div>
        <div className="flex flex-col sm:items-end gap-1.5">
          {lastSyncAt && (
            <p className="text-xs text-muted-foreground">
              Last updated {lastSyncAt}
            </p>
          )}
          <div className="flex items-center gap-3">
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
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-xl mb-6">
          Error loading deals: {error.message}
        </div>
      )}

      {!deals || deals.length === 0 ? (
        <div className="glass-card p-12 rounded-2xl text-center">
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
        <DealsGrid deals={deals} dealExtras={dealExtras} />
      )}
    </div>
    </OrgGuard>
  );
}
