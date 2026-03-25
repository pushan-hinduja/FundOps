import { SupabaseClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import { getAnthropicClient, MODEL_ID } from "../anthropic";

interface InsightsContext {
  supabase: SupabaseClient;
  organizationId: string;
}

function hashInsight(type: string, key: string): string {
  return createHash("sha256").update(type + ":" + key).digest("hex").slice(0, 32);
}

export interface InsightsResult {
  total: number;
  breakdown: Record<string, number>;
}

/**
 * Generate proactive insights for an organization.
 * Designed to be called from a cron job.
 */
export async function generateInsights(ctx: InsightsContext): Promise<InsightsResult> {
  const breakdown: Record<string, number> = {};

  breakdown.silent_lps = await detectSilentLps(ctx);
  breakdown.deadline_approaching = await detectDeadlineApproaching(ctx);
  breakdown.stalled_wires = await detectStalledWires(ctx);
  breakdown.commitment_milestones = await detectCommitmentMilestones(ctx);
  breakdown.follow_ups_due = await detectFollowUpsDue(ctx);
  breakdown.ai_generated = await detectAIInsights(ctx);

  const total = Object.values(breakdown).reduce((s, n) => s + n, 0);
  return { total, breakdown };
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

  if (error) {
    console.error("[Insights] Upsert error for " + insight.type + ":", error.message);
  }
  return !error;
}

async function detectSilentLps(ctx: InsightsContext): Promise<number> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: silent, error: silentErr } = await ctx.supabase
    .from("deal_lp_relationships")
    .select(
      "lp_contact_id, deal_id, deals!inner(id, name, status, organization_id), lp_contacts!inner(id, name, firm, last_interaction_at)"
    )
    .eq("deals.organization_id", ctx.organizationId)
    .eq("deals.status", "active")
    .in("status", ["contacted", "interested"]);

  if (silentErr) {
    console.error("[Insights] Silent LPs query error:", silentErr.message);
    return 0;
  }
  if (!silent || silent.length === 0) {
    console.log("[Insights] Silent LPs: no matching relationships found");
    return 0;
  }
  console.log("[Insights] Silent LPs: found " + silent.length + " candidate relationship(s)");

  // Group by deal and filter for silent LPs
  const byDeal: Record<string, { dealName: string; lps: { id: string; name: string; firm: string | null }[] }> = {};

  for (const rel of silent) {
    const lp = rel.lp_contacts as unknown as { id: string; name: string; firm: string | null; last_interaction_at: string | null };
    const deal = rel.deals as unknown as { id: string; name: string };

    if (!lp.last_interaction_at || new Date(lp.last_interaction_at) < sevenDaysAgo) {
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
      description: "No response in 7+ days: " + lpNames,
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

  const { data: deals, error: deadlineErr } = await ctx.supabase
    .from("deals")
    .select("id, name, close_date, total_committed, target_raise")
    .eq("organization_id", ctx.organizationId)
    .eq("status", "active")
    .lte("close_date", sevenDaysFromNow.toISOString())
    .gte("close_date", new Date().toISOString());

  if (deadlineErr) {
    console.error("[Insights] Deadline query error:", deadlineErr.message);
    return 0;
  }
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
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const { data: stalled, error: stalledErr } = await ctx.supabase
    .from("deal_lp_relationships")
    .select(
      "lp_contact_id, deal_id, committed_amount, updated_at, deals!inner(id, name, organization_id, status), lp_contacts!inner(id, name)"
    )
    .eq("deals.organization_id", ctx.organizationId)
    .eq("deals.status", "active")
    .in("status", ["committed", "allocated"])
    .eq("wire_status", "pending")
    .lte("updated_at", threeDaysAgo.toISOString());

  if (stalledErr) {
    console.error("[Insights] Stalled wires query error:", stalledErr.message);
    return 0;
  }
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
      title: group.lps.length + " wire(s) pending 3+ days on " + group.dealName,
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
  const { data: deals, error: milestoneErr } = await ctx.supabase
    .from("deals")
    .select("id, name, total_committed, target_raise")
    .eq("organization_id", ctx.organizationId)
    .eq("status", "active")
    .gt("target_raise", 0);

  if (milestoneErr) {
    console.error("[Insights] Milestones query error:", milestoneErr.message);
    return 0;
  }
  if (!deals || deals.length === 0) {
    console.log("[Insights] Milestones: no active deals with target_raise > 0");
    return 0;
  }
  console.log("[Insights] Milestones: checking " + deals.length + " deal(s):", deals.map((d) => d.name + " " + Math.round((d.total_committed / d.target_raise) * 100) + "%").join(", "));

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

/**
 * Use an LLM to analyze org data and surface insights that the
 * hardcoded detectors wouldn't catch — patterns, anomalies,
 * strategic observations, and timing-based recommendations.
 */
async function detectAIInsights(ctx: InsightsContext): Promise<number> {
  try {
    // Gather a snapshot of the org's current state
    const [dealsResult, recentActivity, memories] = await Promise.all([
      ctx.supabase
        .from("deals")
        .select("id, name, status, total_committed, target_raise, close_date, created_at")
        .eq("organization_id", ctx.organizationId)
        .in("status", ["active", "closed"])
        .order("created_at", { ascending: false })
        .limit(20),
      ctx.supabase
        .from("deal_lp_relationships")
        .select(
          "status, wire_status, committed_amount, updated_at, deals!inner(name, organization_id, status), lp_contacts!inner(name, firm, investor_type)"
        )
        .eq("deals.organization_id", ctx.organizationId)
        .order("updated_at", { ascending: false })
        .limit(50),
      ctx.supabase
        .from("agent_memories")
        .select("content, category, created_at")
        .eq("organization_id", ctx.organizationId)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    const deals = dealsResult.data || [];
    const activity = recentActivity.data || [];
    const memos = memories.data || [];

    // Don't call the LLM if there's barely any data
    if (deals.length === 0 && activity.length === 0) return 0;

    // Build a compact data summary for the LLM
    const dealsSummary = deals.map((d) => ({
      name: d.name,
      status: d.status,
      committed: d.total_committed,
      target: d.target_raise,
      pctRaised: d.target_raise > 0 ? Math.round((d.total_committed / d.target_raise) * 100) : 0,
      closeDate: d.close_date,
    }));

    // Aggregate LP activity stats
    const statusCounts: Record<string, number> = {};
    const wireCounts: Record<string, number> = {};
    for (const a of activity) {
      statusCounts[a.status] = (statusCounts[a.status] || 0) + 1;
      if (a.wire_status) wireCounts[a.wire_status] = (wireCounts[a.wire_status] || 0) + 1;
    }

    const recentMemos = memos.map((m) => m.category + ": " + m.content).join("\n");

    const prompt = `You are an analyst for a fund operations platform. Analyze the following data snapshot for an organization and identify 1-3 actionable insights that a fund manager would find valuable. Focus on patterns, anomalies, or strategic observations that simple threshold-based rules wouldn't catch.

## Active Deals
${JSON.stringify(dealsSummary, null, 2)}

## LP Pipeline Activity (recent 50 relationships)
Status breakdown: ${JSON.stringify(statusCounts)}
Wire status breakdown: ${JSON.stringify(wireCounts)}

## Recent Agent Memories
${recentMemos || "None"}

## Today's Date
${new Date().toISOString().split("T")[0]}

Respond with a JSON array of insights. Each insight should have:
- "title": short headline (under 60 chars)
- "description": 1-2 sentence explanation with specific data points
- "priority": "low" | "medium" | "high"

Only include genuinely useful insights. If there's nothing noteworthy, return an empty array.
Return ONLY the JSON array, no other text.`;

    const client = getAnthropicClient();
    const response = await client.messages.create({
      model: MODEL_ID,
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") return 0;

    // Parse the JSON response — handle markdown code fences
    let jsonStr = text.text.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed) || parsed.length === 0) return 0;

    let count = 0;
    for (const insight of parsed.slice(0, 3)) {
      if (!insight.title || !insight.description) continue;

      const title = String(insight.title).slice(0, 120);
      const description = String(insight.description).slice(0, 500);
      const priority = ["low", "medium", "high"].includes(insight.priority)
        ? insight.priority
        : "medium";

      // Hash on the title to deduplicate similar insights across runs
      const created = await upsertInsight(ctx, {
        type: "ai_generated",
        title,
        description,
        priority,
        hash: hashInsight("ai_generated", title.toLowerCase().replace(/\s+/g, "_")),
      });
      if (created) count++;
    }
    return count;
  } catch (err) {
    console.error("[Insights] AI insight generation error:", err);
    return 0;
  }
}
