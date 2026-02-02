import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  InvestorType,
  AccreditationStatus,
  TaxStatus,
  KYCStatus,
} from "@/lib/supabase/types";

// GET /api/lps/[id] - Get LP profile
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

    const { data: lp, error } = await supabase
      .from("lp_contacts")
      .select("*")
      .eq("id", id)
      .eq("organization_id", userData.organization_id)
      .single();

    if (error || !lp) {
      return NextResponse.json({ error: "LP not found" }, { status: 404 });
    }

    return NextResponse.json(lp);
  } catch (error) {
    console.error("Error fetching LP:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/lps/[id] - Update LP profile
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

    const body = await request.json();

    // Validate enum fields if provided
    const validInvestorTypes: InvestorType[] = [
      "individual",
      "institution",
      "family_office",
      "fund_of_funds",
      "endowment",
      "pension",
      "sovereign_wealth",
    ];
    const validAccreditationStatuses: AccreditationStatus[] = [
      "accredited_investor",
      "qualified_purchaser",
      "qualified_client",
      "non_accredited",
    ];
    const validTaxStatuses: TaxStatus[] = [
      "us_individual",
      "us_entity",
      "foreign_individual",
      "foreign_entity",
      "tax_exempt",
    ];
    const validKYCStatuses: KYCStatus[] = [
      "not_started",
      "pending",
      "in_review",
      "approved",
      "expired",
      "rejected",
    ];

    if (
      body.investor_type &&
      !validInvestorTypes.includes(body.investor_type)
    ) {
      return NextResponse.json(
        { error: "Invalid investor type" },
        { status: 400 }
      );
    }

    if (
      body.accreditation_status &&
      !validAccreditationStatuses.includes(body.accreditation_status)
    ) {
      return NextResponse.json(
        { error: "Invalid accreditation status" },
        { status: 400 }
      );
    }

    if (body.tax_status && !validTaxStatuses.includes(body.tax_status)) {
      return NextResponse.json(
        { error: "Invalid tax status" },
        { status: 400 }
      );
    }

    if (body.kyc_status && !validKYCStatuses.includes(body.kyc_status)) {
      return NextResponse.json(
        { error: "Invalid KYC status" },
        { status: 400 }
      );
    }

    // Build update object with allowed fields
    const allowedFields = [
      "name",
      "email",
      "firm",
      "title",
      "phone",
      "preferred_check_size",
      "notes",
      "investor_type",
      "accreditation_status",
      "tax_status",
      "kyc_status",
      "special_fee_percent",
      "special_carry_percent",
    ];

    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = body[field];
      }
    }

    const { data: lp, error } = await supabase
      .from("lp_contacts")
      .update(updateData)
      .eq("id", id)
      .eq("organization_id", userData.organization_id)
      .select()
      .single();

    if (error) {
      console.error("Error updating LP:", error);
      return NextResponse.json(
        { error: "Failed to update LP" },
        { status: 500 }
      );
    }

    return NextResponse.json(lp);
  } catch (error) {
    console.error("Error updating LP:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/lps/[id] - Delete LP
export async function DELETE(
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

    const { error } = await supabase
      .from("lp_contacts")
      .delete()
      .eq("id", id)
      .eq("organization_id", userData.organization_id);

    if (error) {
      console.error("Error deleting LP:", error);
      return NextResponse.json(
        { error: "Failed to delete LP" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting LP:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
