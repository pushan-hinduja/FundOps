import { SupabaseClient } from "@supabase/supabase-js";
import { createHash } from "crypto";

interface InsightsContext {
  supabase: SupabaseClient;
  organizationId: string;
}

function hashInsight(type: string, key: string): string {
  return createHash("sha256").update(type + ":" + key).digest("hex").slice(0, 32);
}

/**
 * Generate proactive insights for an organization.
 * Designed to be called from a cron job.
 */
export async function generateInsights(ctx: InsightsContext): Promise<number> {
  let insightsCreated = 0;

  insightsCreated += await detectSilentLps(ctx);
  insightsCreated += await detectDeadlineApproaching(ctx);
  insightsCreated += await detectStalledWires(ctx);
  insightsCreated += await detectCommitmentMilestones(ctx);
  insightsCreated += await detectFollowUpsDue(ctx);

  return insightsCreated;
}

async function upsertInsight(
  ctx: InsightsContext,
  insight: {
    type: string;
    title: string;
    description: string;
    dealId?: string;
    lpContactIds?: string[];
    priority: string;
    hash: string;
  }
): Promise<boolean> {
  const { error } = await ctx.supabase.from("agent_insights").upsert(
    {
      organization_id: ctx.organizationId,
      insight_type: insight.type,
      title: insight.title,
      description: insight.description,
      deal_id: insight.dealId || null,
      lp_contact_ids: insight.lpContactIds || null,
      priority: insight.priority,
      insight_hash: insight.hash,
    },
    { onConflict: "organization_id,insight_hash", ignoreDuplicates: true }
  );

  return !error;
}

async function detectSilentLps(ctx: InsightsContext): Promise<number> {
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const { data: silent } = await ctx.supabase
    .from("deal_lp_relationships")
    .select(
      "lp_contact_id, deal_id, deals!inner(id, name, status, organization_id), lp_contacts!inner(id, name, firm, last_interaction_at)"
    )
    .eq("deals.organization_id", ctx.organizationId)
    .eq("deals.status", "active")
    .in("status", ["contacted", "interested"]);

  if (!silent || silent.length === 0) return 0;

  // Group by deal and filter for silent LPs
  const byDeal: Record<string, { dealName: string; lps: { id: string; name: string; firm: string | null }[] }> = {};

  for (const rel of silent) {
    const lp = rel.lp_contacts as unknown as { id: string; name: string; firm: string | null; last_interaction_at: string | null };
    const deal = rel.deals as unknown as { id: string; name: string };

    if (!lp.last_interaction_at || new Date(lp.last_interaction_at) < fourteenDaysAgo) {
      const did = rel.deal_id as string;
      if (!byDeal[did]) {
        byDeal[did] = { dealName: deal.name, lps: [] };
      }
      byDeal[did].lps.push({ id: lp.id, name: lp.name, firm: lp.firm });
    }
  }

  let count = 0;
  for (const [dealId, group] of Object.entries(byDeal)) {
    if (group.lps.length === 0) continue;

    const lpNames = group.lps.map((l) => l.name + (l.firm ? " (" + l.firm + ")" : "")).join(", ");
    const lpIds = group.lps.map((l) => l.id).sort();

    const created = await upsertInsight(ctx, {
      type: "silent_lps",
      title: group.lps.length + " LP(s) silent on " + group.dealName,
      description: "No response in 14+ days: " + lpNames,
      dealId,
      lpContactIds: lpIds,
      priority: group.lps.length >= 3 ? "high" : "medium",
      hash: hashInsight("silent_lps", dealId + ":" + lpIds.join(",")),
    });
    if (created) count++;
  }
  return count;
}

async function detectDeadlineApproaching(ctx: InsightsContext): Promise<number> {
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  const { data: deals } = await ctx.supabase
    .from("deals")
    .select("id, name, close_date, total_committed, target_raise")
    .eq("organization_id", ctx.organizationId)
    .eq("status", "active")
    .lte("close_date", sevenDaysFromNow.toISOString())
    .gte("close_date", new Date().toISOString());

  if (!deals || deals.length === 0) return 0;

  let count = 0;
  for (const deal of deals) {
    const daysLeft = Math.ceil(
      (new Date(deal.close_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    const progress = deal.target_raise > 0
      ? Math.round((deal.total_committed / deal.target_raise) * 100)
      : 0;

    const created = await upsertInsight(ctx, {
      type: "deadline_approaching",
      title: deal.name + " closes in " + daysLeft + " day(s)",
      description: "Currently at " + progress + "% of target raise ($" + (deal.total_committed / 1000000).toFixed(1) + "M / $" + (deal.target_raise / 1000000).toFixed(1) + "M)",
      dealId: deal.id,
      priority: daysLeft <= 3 ? "urgent" : "high",
      hash: hashInsight("deadline_approaching", deal.id),
    });
    if (created) count++;
  }
  return count;
}

async function detectStalledWires(ctx: InsightsContext): Promise<number> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: stalled } = await ctx.supabase
    .from("deal_lp_relationships")
    .select(
      "lp_contact_id, deal_id, committed_amount, updated_at, deals!inner(id, name, organization_id, status), lp_contacts!inner(id, name)"
    )
    .eq("deals.organization_id", ctx.organizationId)
    .eq("deals.status", "active")
    .in("status", ["committed", "allocated"])
    .eq("wire_status", "pending")
    .lte("updated_at", sevenDaysAgo.toISOString());

  if (!stalled || stalled.length === 0) return 0;

  // Group by deal
  const byDeal: Record<string, { dealName: string; lps: { name: string; amount: number }[] }> = {};
  for (const rel of stalled) {
    const deal = rel.deals as unknown as { id: string; name: string };
    const lp = rel.lp_contacts as unknown as { name: string };
    const did = rel.deal_id as string;
    if (!byDeal[did]) byDeal[did] = { dealName: deal.name, lps: [] };
    byDeal[did].lps.push({ name: lp.name, amount: Number(rel.committed_amount) || 0 });
  }

  let count = 0;
  for (const [dealId, group] of Object.entries(byDeal)) {
    const totalPending = group.lps.reduce((s, l) => s + l.amount, 0);
    const lpNames = group.lps.map((l) => l.name).join(", ");

    const created = await upsertInsight(ctx, {
      type: "wire_stalled",
      title: group.lps.length + " wire(s) pending 7+ days on " + group.dealName,
      description: "Total pending: $" + (totalPending / 1000000).toFixed(1) + "M from " + lpNames,
      dealId,
      priority: "high",
      hash: hashInsight("wire_stalled", dealId),
    });
    if (created) count++;
  }
  return count;
}

async function detectCommitmentMilestones(ctx: InsightsContext): Promise<number> {
  const { data: deals } = await ctx.supabase
    .from("deals")
    .select("id, name, total_committed, target_raise")
    .eq("organization_id", ctx.organizationId)
    .eq("status", "active")
    .gt("target_raise", 0);

  if (!deals || deals.length === 0) return 0;

  let count = 0;
  const milestones = [90, 75, 50];

  for (const deal of deals) {
    const progress = (deal.total_committed / deal.target_raise) * 100;

    for (const milestone of milestones) {
      if (progress >= milestone && progress < milestone + 10) {
        const created = await upsertInsight(ctx, {
          type: "commitment_milestone",
          title: deal.name + " passed " + milestone + "% committed",
          description: "$" + (deal.total_committed / 1000000).toFixed(1) + "M of $" + (deal.target_raise / 1000000).toFixed(1) + "M target",
          dealId: deal.id,
          priority: milestone >= 90 ? "high" : "medium",
          hash: hashInsight("commitment_milestone", deal.id + ":" + milestone),
        });
        if (created) count++;
        break; // Only one milestone per deal
      }
    }
  }
  return count;
}

async function detectFollowUpsDue(ctx: InsightsContext): Promise<number> {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const { data: followups } = await ctx.supabase
    .from("agent_memories")
    .select("id, content, user_id, expires_at")
    .eq("organization_id", ctx.organizationId)
    .eq("category", "follow_up")
    .eq("is_active", true)
    .lte("expires_at", tomorrow.toISOString())
    .gte("expires_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  if (!followups || followups.length === 0) return 0;

  let count = 0;
  for (const fu of followups) {
    const created = await upsertInsight(ctx, {
      type: "follow_up_due",
      title: "Follow-up due",
      description: fu.content,
      priority: "medium",
      hash: hashInsight("follow_up_due", fu.id),
    });
    if (created) count++;
  }
  return count;
}
