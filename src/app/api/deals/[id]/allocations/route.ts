import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { WireStatus, CloseReadinessMetrics } from "@/lib/supabase/types";

// GET /api/deals/[id]/allocations - Get allocations and close readiness metrics
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from("users")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (!userData?.organization_id) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 400 }
      );
    }

    // Verify deal belongs to organization
    const { data: deal } = await supabase
      .from("deals")
      .select("id, target_raise")
      .eq("id", id)
      .eq("organization_id", userData.organization_id)
      .single();

    if (!deal) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    // Fetch all LP relationships with LP info and documents
    const { data: relationships, error: relError } = await supabase
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
      .in("status", ["committed", "allocated"]);

    if (relError) {
      console.error("Error fetching relationships:", relError);
      return NextResponse.json(
        { error: "Failed to fetch allocations" },
        { status: 500 }
      );
    }

    // Get LP IDs that are committed/allocated
    const lpIds = relationships?.map((r) => r.lp_contact_id) || [];

    // Fetch documents for all committed LPs
    let docsPerLP: Record<string, { hasApprovedDocs: boolean }> = {};
    if (lpIds.length > 0) {
      const { data: docs } = await supabase
        .from("lp_documents")
        .select("lp_contact_id, status")
        .in("lp_contact_id", lpIds);

      // Group docs by LP and check for approved status
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

    // Calculate metrics
    const totalLPs = relationships?.length || 0;
    const lpsWithDocs = Object.values(docsPerLP).filter(
      (d) => d.hasApprovedDocs
    ).length;
    const totalAllocated =
      relationships?.reduce((sum, r) => sum + (r.allocated_amount || 0), 0) || 0;
    const totalWired =
      relationships?.reduce((sum, r) => sum + (r.wire_amount_received || 0), 0) ||
      0;
    const targetRaise = deal.target_raise || 0;

    const pendingItems =
      relationships
        ?.filter((r) => {
          const hasDocs = docsPerLP[r.lp_contact_id]?.hasApprovedDocs || false;
          const pendingWire =
            r.wire_status !== "complete" && (r.allocated_amount || 0) > 0;
          return !hasDocs || pendingWire;
        })
        .map((r) => ({
          lpId: r.lp_contact_id,
          lpName: r.lp_contacts?.name || "Unknown",
          missingDocs: !docsPerLP[r.lp_contact_id]?.hasApprovedDocs,
          pendingWire:
            r.wire_status !== "complete" && (r.allocated_amount || 0) > 0,
          amount: r.allocated_amount || r.committed_amount || 0,
        })) || [];

    const metrics: CloseReadinessMetrics = {
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

    return NextResponse.json({
      metrics,
      allocations: relationships,
    });
  } catch (error) {
    console.error("Error fetching allocations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/deals/[id]/allocations - Update allocation for an LP
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from("users")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (!userData?.organization_id) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 400 }
      );
    }

    // Verify deal belongs to organization
    const { data: deal } = await supabase
      .from("deals")
      .select("id")
      .eq("id", id)
      .eq("organization_id", userData.organization_id)
      .single();

    if (!deal) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    const body = await request.json();

    if (!body.relationship_id) {
      return NextResponse.json(
        { error: "relationship_id is required" },
        { status: 400 }
      );
    }

    // Validate wire_status if provided
    const validWireStatuses: WireStatus[] = ["pending", "partial", "complete"];
    if (body.wire_status && !validWireStatuses.includes(body.wire_status)) {
      return NextResponse.json(
        { error: "Invalid wire status" },
        { status: 400 }
      );
    }

    // Build update object
    const updateData: Record<string, unknown> = {};
    const allowedFields = [
      "reserved_amount",
      "allocated_amount",
      "committed_amount",
      "wire_status",
      "wire_amount_received",
      "close_date",
      "notes",
      "status",
      "management_fee_percent",
      "carry_percent",
      "minimum_commitment",
      "side_letter_terms",
      "has_mfn_rights",
      "has_coinvest_rights",
      "reporting_frequency",
    ];

    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = body[field];
      }
    }

    // If wire received, set timestamp
    if (body.wire_amount_received && body.wire_amount_received > 0) {
      if (!body.wire_received_at) {
        updateData.wire_received_at = new Date().toISOString();
      }
    }

    const { data: relationship, error } = await supabase
      .from("deal_lp_relationships")
      .update(updateData)
      .eq("id", body.relationship_id)
      .eq("deal_id", id)
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
      .single();

    if (error) {
      console.error("Error updating allocation:", error);
      return NextResponse.json(
        { error: "Failed to update allocation" },
        { status: 500 }
      );
    }

    // Update deal totals
    await updateDealTotals(supabase, id);

    return NextResponse.json(relationship);
  } catch (error) {
    console.error("Error updating allocation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper to update deal totals after allocation change
async function updateDealTotals(supabase: any, dealId: string) {
  const { data: relationships } = await supabase
    .from("deal_lp_relationships")
    .select("status, committed_amount")
    .eq("deal_id", dealId);

  if (!relationships) return;

  const totalCommitted = relationships
    .filter((r: any) => r.status === "committed" || r.status === "allocated")
    .reduce((sum: number, r: any) => sum + (r.committed_amount || 0), 0);

  const totalInterested = relationships
    .filter((r: any) => r.status === "interested")
    .reduce((sum: number, r: any) => sum + (r.committed_amount || 0), 0);

  await supabase
    .from("deals")
    .update({
      total_committed: totalCommitted,
      total_interested: totalInterested,
    })
    .eq("id", dealId);
}
