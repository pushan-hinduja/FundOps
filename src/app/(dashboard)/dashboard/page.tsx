import { createClient } from "@/lib/supabase/server";
import DashboardChart from "@/components/dashboard/DashboardChart";
import { DashboardMetricCards } from "@/components/dashboard/DashboardMetricCards";
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

  // Fetch all data for dashboard
  let deals: Deal[] = [];
  let pendingWiresData: { dealId: string; lpName: string; dealName: string; wireStatus: string; amount: number | null }[] = [];
  let unansweredQuestionsData: { dealId: string; fromEmail: string; question: string; dealName: string }[] = [];
  let allocatedByDeal: Record<string, number> = {};

  if (userData?.organization_id) {
    const orgId = userData.organization_id;

    const [dealsResult, allocationsResult, pendingWiresResult, unansweredQuestionsResult] = await Promise.all([
      supabase
        .from("deals")
        .select("*")
        .eq("organization_id", orgId),
      // Allocated amounts per deal (for Capital Allocated card)
      supabase
        .from("deal_lp_relationships")
        .select("deal_id, allocated_amount, deals!inner(organization_id, status)")
        .eq("deals.organization_id", orgId)
        .eq("deals.status", "active")
        .eq("status", "allocated"),
      // Pending wires with LP and deal names
      supabase
        .from("deal_lp_relationships")
        .select("deal_id, committed_amount, wire_status, lp_contacts!inner(name), deals!inner(name, organization_id)")
        .eq("deals.organization_id", orgId)
        .in("status", ["committed", "allocated"])
        .in("wire_status", ["pending", "partial"]),
      // Unanswered questions associated with active deals
      supabase
        .from("emails_parsed")
        .select("detected_deal_id, extracted_questions, emails_raw!inner(from_email, organization_id), deals!inner(name, status)")
        .eq("emails_raw.organization_id", orgId)
        .eq("intent", "question")
        .eq("is_answered", false)
        .eq("deals.status", "active"),
    ]);

    deals = (dealsResult.data || []) as Deal[];

    // Aggregate allocated amounts by deal
    allocatedByDeal = (allocationsResult.data || []).reduce((acc: Record<string, number>, r: any) => {
      const dealId = r.deal_id;
      acc[dealId] = (acc[dealId] || 0) + (r.allocated_amount || 0);
      return acc;
    }, {});

    pendingWiresData = (pendingWiresResult.data || []).map((r: any) => ({
      dealId: r.deal_id,
      lpName: r.lp_contacts?.name || "Unknown LP",
      dealName: r.deals?.name || "Unknown Deal",
      wireStatus: r.wire_status,
      amount: r.committed_amount,
    }));

    unansweredQuestionsData = (unansweredQuestionsResult.data || []).map((r: any) => ({
      dealId: r.detected_deal_id,
      fromEmail: r.emails_raw?.from_email || "Unknown",
      question: r.extracted_questions?.[0] || "Question",
      dealName: r.deals?.name || "Unknown Deal",
    }));
  }

  // Calculate metrics
  const activeDealsData = deals.filter(deal => deal.status === "active");
  const totalAllocated = Object.values(allocatedByDeal).reduce((sum, amount) => sum + amount, 0);
  const totalCommitted = activeDealsData.reduce((sum, deal) => sum + (deal.total_committed || 0), 0);
  const totalInterested = activeDealsData.reduce((sum, deal) => sum + (deal.total_interested || 0), 0);
  const totalTarget = activeDealsData.reduce((sum, deal) => sum + (deal.target_raise || 0), 0);

  return (
    <div className="px-8 py-6 pb-36">
      {/* Chart Section - Client Component */}
      <DashboardChart
        deals={deals}
        organizationName={organizationName}
        totalCommitted={totalCommitted}
        totalInterested={totalInterested}
        totalTarget={totalTarget}
      />

      {/* Metric Cards - Client Component */}
      <DashboardMetricCards
        deals={deals}
        totalAllocated={totalAllocated}
        totalCommitted={totalCommitted}
        totalInterested={totalInterested}
        totalTarget={totalTarget}
        allocatedByDeal={allocatedByDeal}
        pendingWires={pendingWiresData}
        unansweredQuestions={unansweredQuestionsData}
      />
    </div>
  );
}
